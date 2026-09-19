(function () {
  "use strict";

  // Bumped on every content/logic change so browsers can't serve a stale
  // cached copy of the JSON data files after a republish.
  var ASSET_VERSION = "v29";

  var ENERGY_RANK = { low: 0, normal: 1, motiviert: 2 };
  var MEAL_TYPE_ORDER = ["fruehstueck", "mittagessen", "abendessen", "snack"];
  var CATEGORY_ORDER = ["Gemüse & Obst", "Proteinquellen", "Getreide & Beilagen", "Kühlprodukte", "Vorrat", "Gewürze", "Sonstiges"];
  var CATEGORY_LABELS = { "Vorrat": "Vorratsschrank" };
  var WHOLE_UNIT_ROUNDING = ["EL", "TL", "Stück", "Dose", "Bund", "Scheiben", "Kopf", "Blätter", "Prise"];
  var STEP_COUNT = 5;

  var recipes = [];
  var storageNotes = {};

  var state = {
    step: 1,
    diet: null,
    restrictions: [],
    season: null,
    taste: [],
    situation: [],
    mealTypes: [],
    maxTime: null,
    energy: null,
    days: null,
    persons: null,
    shownIds: [],
    mainDishes: [],
    snackDishes: [],
    selectedIds: []
  };

  var screens = {};
  var els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheEls();
    bindStaticEvents();
    Promise.all([
      fetch("data/recipes.json?v=" + ASSET_VERSION).then(function (r) { return r.json(); }),
      fetch("data/storage-notes.json?v=" + ASSET_VERSION).then(function (r) { return r.json(); })
    ]).then(function (results) {
      recipes = results[0];
      storageNotes = results[1];
    }).catch(function (err) {
      console.error("Konnte Rezeptdaten nicht laden:", err);
    });
  }

  function cacheEls() {
    ["intro", "wizard", "loading", "results", "plan"].forEach(function (name) {
      screens[name] = document.getElementById("screen-" + name);
    });
    els.progressLabel = document.getElementById("progress-label");
    els.progressFill = document.getElementById("progress-fill");
    els.btnStart = document.getElementById("btn-start");
    els.btnBack = document.getElementById("btn-back");
    els.btnNext = document.getElementById("btn-next");
    els.btnShuffle = document.getElementById("btn-shuffle");
    els.btnMakePlan = document.getElementById("btn-make-plan");
    els.btnRestart = document.getElementById("btn-restart");
    els.btnDownloadPdf = document.getElementById("btn-download-pdf");
    els.recipeGrid = document.getElementById("recipe-grid");
    els.fallbackHint = document.getElementById("fallback-hint");
    els.breakfastTip = document.getElementById("breakfast-tip");
    els.planSteps = document.getElementById("plan-steps");
    els.shoppingList = document.getElementById("shopping-list");
    els.ingredientTips = document.getElementById("ingredient-tips");
    els.storageNotesEl = document.getElementById("storage-notes");
  }

  function bindStaticEvents() {
    els.btnStart.addEventListener("click", function () {
      showScreen("wizard");
      renderStep();
    });

    document.querySelectorAll(".options").forEach(function (group) {
      group.addEventListener("click", function (e) {
        var btn = e.target.closest(".option");
        if (!btn) return;
        handleOptionClick(group, btn);
      });
    });

    els.btnBack.addEventListener("click", function () {
      if (state.step > 1) {
        state.step -= 1;
        renderStep();
      }
    });

    els.btnNext.addEventListener("click", function () {
      if (state.step < STEP_COUNT) {
        state.step += 1;
        renderStep();
      } else {
        runGeneration();
      }
    });

    els.btnShuffle.addEventListener("click", function () {
      runGeneration(true);
    });

    els.btnMakePlan.addEventListener("click", buildPlan);

    els.btnDownloadPdf.addEventListener("click", function () {
      window.print();
    });

    els.btnRestart.addEventListener("click", function () {
      resetState();
      showScreen("intro");
    });
  }

  function handleOptionClick(group, btn) {
    var groupName = group.getAttribute("data-group");
    var mode = group.getAttribute("data-mode");
    var value = btn.getAttribute("data-value");

    if (mode === "single") {
      Array.prototype.forEach.call(group.children, function (child) {
        child.classList.remove("selected");
      });
      btn.classList.add("selected");
      state[groupName] = isNaN(value) ? value : Number(value);
    } else {
      var arr = state[groupName];
      var idx = arr.indexOf(value);
      if (idx === -1) {
        arr.push(value);
        btn.classList.add("selected");
      } else {
        arr.splice(idx, 1);
        btn.classList.remove("selected");
      }
    }
    updateNextButtonState();
  }

  function updateNextButtonState() {
    var stepEl = document.querySelector('.step[data-step="' + state.step + '"]');
    var requiredGroups = stepEl.querySelectorAll('.options[data-mode="single"]');
    var allFilled = true;
    requiredGroups.forEach(function (group) {
      var groupName = group.getAttribute("data-group");
      if (state[groupName] === null || state[groupName] === undefined) {
        allFilled = false;
      }
    });
    if (state.step === 2 && state.taste.length === 0) {
      allFilled = false;
    }
    if (state.step === 3 && state.mealTypes.length === 0) {
      allFilled = false;
    }
    els.btnNext.disabled = !allFilled;
    els.btnNext.textContent = state.step === STEP_COUNT ? "Meinen Plan erstellen" : "Weiter";
  }

  function renderStep() {
    document.querySelectorAll(".step").forEach(function (el) {
      el.hidden = Number(el.getAttribute("data-step")) !== state.step;
    });
    els.progressLabel.textContent = "Schritt " + state.step + " von " + STEP_COUNT;
    els.progressFill.style.width = (state.step / STEP_COUNT * 100) + "%";
    els.btnBack.style.visibility = state.step === 1 ? "hidden" : "visible";
    updateNextButtonState();
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== name;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetState() {
    state.step = 1;
    state.diet = null;
    state.restrictions = [];
    state.season = null;
    state.taste = [];
    state.situation = [];
    state.mealTypes = [];
    state.maxTime = null;
    state.energy = null;
    state.days = null;
    state.persons = null;
    state.shownIds = [];
    state.mainDishes = [];
    state.snackDishes = [];
    state.selectedIds = [];
    document.querySelectorAll(".option.selected").forEach(function (el) {
      el.classList.remove("selected");
    });
    document.querySelectorAll(".step").forEach(function (el, i) {
      el.hidden = i !== 0;
    });
  }

  // ---------- Filtering & selection ----------

  function dietMatches(recipe) {
    if (state.diet === "vegan") return recipe.diet_type === "vegan";
    if (state.diet === "vegetarisch") return recipe.diet_type === "vegan" || recipe.diet_type === "vegetarisch";
    return true; // mit_fleisch / flexibel: alles erlaubt
  }

  function restrictionsMatch(recipe) {
    return state.restrictions.every(function (r) {
      return recipe.free_of.indexOf(r) !== -1;
    });
  }

  function mealTypeMatches(recipe, mealTypes) {
    return recipe.meal_type.some(function (mt) { return mealTypes.indexOf(mt) !== -1; });
  }

  function timeMatches(recipe, maxTime) {
    return recipe.total_time_min <= maxTime;
  }

  function energyMatches(recipe, energy) {
    return ENERGY_RANK[recipe.min_energy] <= ENERGY_RANK[energy];
  }

  function situationMatches(recipe, situation) {
    if (situation.indexOf("arbeit") !== -1 && !recipe.work_friendly) return false;
    if (situation.indexOf("familie") !== -1 && !recipe.family_friendly) return false;
    if (situation.indexOf("ausflug") !== -1 && !recipe.work_friendly) return false;
    return true;
  }

  function seasonMatches(recipe, season) {
    if (!season || season === "egal") return true;
    return recipe.season.indexOf("egal") !== -1 || recipe.season.indexOf(season) !== -1;
  }

  function tasteMatches(recipe, taste) {
    if (!taste || taste.length === 0) return true;
    return taste.indexOf(recipe.taste) !== -1;
  }

  function filterCandidates(mealTypes, opts) {
    opts = opts || {};
    var maxTime = opts.maxTime !== undefined ? opts.maxTime : state.maxTime;
    var energy = opts.energy || state.energy;
    var useSituation = opts.useSituation !== false;
    var useSeason = opts.useSeason !== false;
    var useTaste = opts.useTaste !== false;

    return recipes.filter(function (r) {
      if (!dietMatches(r)) return false;
      if (!restrictionsMatch(r)) return false;
      if (!mealTypeMatches(r, mealTypes)) return false;
      if (!timeMatches(r, maxTime)) return false;
      if (!energyMatches(r, energy)) return false;
      if (useSituation && !situationMatches(r, state.situation)) return false;
      if (useSeason && !seasonMatches(r, state.season)) return false;
      if (useTaste && !tasteMatches(r, state.taste)) return false;
      return true;
    });
  }

  // Loosens filters step by step until enough candidates are found.
  // Returns { candidates, loosened: boolean }
  function findCandidatesWithFallback(mealTypes, needed, excludeIds) {
    excludeIds = excludeIds || [];
    var timeTiers = [15, 30, 45, 60];
    var energyTiers = ["low", "normal", "motiviert"];
    var startTimeIdx = timeTiers.indexOf(state.maxTime);
    var startEnergyIdx = energyTiers.indexOf(state.energy);
    var loosened = false;

    function usable(list) {
      return list.filter(function (r) { return excludeIds.indexOf(r.id) === -1; });
    }

    // 1) strict
    var candidates = usable(filterCandidates(mealTypes));
    if (candidates.length >= needed) return { candidates: candidates, loosened: false };

    // 2) drop taste filter
    candidates = usable(filterCandidates(mealTypes, { useTaste: false }));
    if (candidates.length >= needed) return { candidates: candidates, loosened: true };
    loosened = true;

    // 3) drop situation filter
    candidates = usable(filterCandidates(mealTypes, { useTaste: false, useSituation: false }));
    if (candidates.length >= needed) return { candidates: candidates, loosened: true };

    // 4) drop season filter
    candidates = usable(filterCandidates(mealTypes, { useTaste: false, useSituation: false, useSeason: false }));
    if (candidates.length >= needed) return { candidates: candidates, loosened: true };

    // 5) raise energy tier
    for (var e = startEnergyIdx + 1; e < energyTiers.length; e++) {
      candidates = usable(filterCandidates(mealTypes, { useTaste: false, useSituation: false, useSeason: false, energy: energyTiers[e] }));
      if (candidates.length >= needed) return { candidates: candidates, loosened: true };
    }

    // 6) raise time tier
    for (var t = startTimeIdx + 1; t < timeTiers.length; t++) {
      candidates = usable(filterCandidates(mealTypes, { useTaste: false, useSituation: false, useSeason: false, energy: energyTiers[energyTiers.length - 1], maxTime: timeTiers[t] }));
      if (candidates.length >= needed) return { candidates: candidates, loosened: true };
    }

    return { candidates: candidates, loosened: loosened };
  }

  function normalizeName(name) {
    return name.trim().toLowerCase();
  }

  function overlapScore(a, b) {
    var namesB = b.ingredients.map(function (i) { return normalizeName(i.name); });
    return a.ingredients.reduce(function (acc, ing) {
      return acc + (namesB.indexOf(normalizeName(ing.name)) !== -1 ? 1 : 0);
    }, 0);
  }

  // When the user wants meat/fish, seat diet_type "flexibel" dishes (the
  // ones that actually contain meat/fish) ahead of plant-based ones that
  // also pass the lenient diet filter, instead of letting them win purely
  // on ingredient overlap. Falls back to plant-based dishes rather than
  // returning too few results if not enough meat/fish options match.
  function dishPriorityBonus(r) {
    if (state.diet === "mit_fleisch" && r.diet_type === "flexibel") return 1000;
    return 0;
  }

  // Greedily picks `count` dishes from candidates, maximizing priority bonus
  // and ingredient overlap with already-chosen dishes (for a tighter
  // shopping list), without ever picking the same dish twice.
  function pickBestSet(candidates, count, chosen) {
    chosen = chosen || [];
    var pool = candidates.slice();
    var picked = [];
    while (picked.length < count && pool.length > 0) {
      var best = null, bestScore = -1, bestIdx = -1;
      pool.forEach(function (r, i) {
        var against = chosen.concat(picked);
        var score = against.reduce(function (acc, s) { return acc + overlapScore(r, s); }, 0) + dishPriorityBonus(r);
        if (score > bestScore) { bestScore = score; best = r; bestIdx = i; }
      });
      picked.push(best);
      pool.splice(bestIdx, 1);
    }
    return picked;
  }

  // Splits `count` as evenly as possible across `groups`, e.g. 6 over 4
  // groups becomes [2, 2, 1, 1].
  function distributeQuota(count, groups) {
    var base = Math.floor(count / groups);
    var remainder = count % groups;
    var quotas = [];
    for (var i = 0; i < groups; i++) {
      quotas.push(base + (i < remainder ? 1 : 0));
    }
    return quotas;
  }

  // Orders dishes round robin by meal type (one per requested type, then
  // the next one per type, ...) so the shown list and the default
  // pre-selection both reflect a mix instead of one type in a row.
  function interleaveByMealType(dishes, mealTypesWanted) {
    var used = [];
    var byType = mealTypesWanted.map(function (mt) {
      return dishes.filter(function (r) {
        if (used.indexOf(r.id) !== -1) return false;
        if (r.meal_type.indexOf(mt) === -1) return false;
        used.push(r.id);
        return true;
      });
    });
    var result = [];
    var maxLen = Math.max.apply(null, byType.map(function (b) { return b.length; }));
    for (var i = 0; i < maxLen; i++) {
      byType.forEach(function (b) { if (b[i]) result.push(b[i]); });
    }
    return result;
  }

  function pickDishes(candidates, mealTypesWanted, count) {
    if (candidates.length <= count) return candidates.slice();

    if (mealTypesWanted.length <= 1) {
      return pickBestSet(candidates, count);
    }

    // Fill an even quota per requested meal type first, so a type whose
    // dishes happen to share a lot of ingredients (and so score high on
    // overlap) can't crowd out the other requested meal types.
    var quotas = distributeQuota(count, mealTypesWanted.length);
    var remaining = candidates.slice();
    var selected = [];

    mealTypesWanted.forEach(function (mt, i) {
      var typePool = remaining.filter(function (r) { return r.meal_type.indexOf(mt) !== -1; });
      var picked = pickBestSet(typePool, quotas[i], selected);
      picked.forEach(function (r) {
        selected.push(r);
        remaining.splice(remaining.indexOf(r), 1);
      });
    });

    // A meal type without enough matching candidates leaves the quota
    // short; fill the rest from whatever is left over.
    if (selected.length < count) {
      selected = selected.concat(pickBestSet(remaining, count - selected.length, selected));
    }

    return interleaveByMealType(selected, mealTypesWanted).slice(0, count);
  }

  function runGeneration(isShuffle) {
    if (!isShuffle) {
      showScreen("loading");
    }

    var exclude = isShuffle ? state.shownIds : [];

    setTimeout(function () {
      var mainMealTypes = state.mealTypes.filter(function (mt) { return mt !== "snack"; });
      if (mainMealTypes.length === 0) mainMealTypes = ["fruehstueck", "mittagessen", "abendessen"];
      // Always follow the natural order of a day, regardless of the order
      // the user happened to click the checkboxes in.
      mainMealTypes.sort(function (a, b) { return MEAL_TYPE_ORDER.indexOf(a) - MEAL_TYPE_ORDER.indexOf(b); });

      var mainResult = findCandidatesWithFallback(mainMealTypes, 6, exclude);
      var mainDishes = pickDishes(mainResult.candidates, mainMealTypes, 6);

      var snackDishes = [];
      var wantsSnacks = state.mealTypes.indexOf("snack") !== -1;
      if (wantsSnacks) {
        var snackExclude = exclude.concat(mainDishes.map(function (r) { return r.id; }));
        var snackResult = findCandidatesWithFallback(["snack"], 4, snackExclude);
        snackDishes = pickDishes(snackResult.candidates, ["snack"], 4);
      }

      state.mainDishes = mainDishes;
      state.snackDishes = snackDishes;
      state.shownIds = mainDishes.concat(snackDishes).map(function (r) { return r.id; });
      var preselectedMain = mainDishes.slice(0, 3).map(function (r) { return r.id; });
      var preselectedSnacks = snackDishes.slice(0, 2).map(function (r) { return r.id; });
      state.selectedIds = preselectedMain.concat(preselectedSnacks);

      renderResults(mainResult.loosened || (wantsSnacks && false));
      showScreen("results");
    }, isShuffle ? 0 : 500);
  }

  var MEAL_TYPE_LABELS = {
    fruehstueck: "Frühstück",
    mittagessen: "Mittagessen",
    abendessen: "Abendessen",
    snack: "Snack"
  };

  function badge(text) {
    return '<span class="badge">' + text + "</span>";
  }

  function mealTypeLabelFor(r) {
    var matches = r.meal_type.filter(function (mt) { return state.mealTypes.indexOf(mt) !== -1; });
    if (matches.length === 0) matches = r.meal_type;
    return matches.map(function (mt) { return MEAL_TYPE_LABELS[mt] || mt; }).join(" / ");
  }

  function recipeBadges(r) {
    var b = [];
    b.push(badge("Antientzündlich orientiert"));
    if (r.high_protein) b.push(badge("Proteinreich"));
    if (r.sugar_free) b.push(badge("Ohne raffinierten Zucker"));
    // "Für die Arbeit geeignet" only adds information when it wasn't already
    // guaranteed by the situation filter (Arbeit/Ausflug both require it).
    var workAlreadyFiltered = state.situation.indexOf("arbeit") !== -1 || state.situation.indexOf("ausflug") !== -1;
    if (r.work_friendly && !workAlreadyFiltered) b.push(badge("Für die Arbeit geeignet"));
    if (r.freezer_friendly) b.push(badge("Einfrierbar"));
    // "Auch kalt lecker" only makes sense for dishes normally eaten warm.
    if (r.no_reheat_needed && r.warm_or_cold !== "kalt") b.push(badge("Auch kalt lecker"));
    b.push(badge(r.total_time_min + " Min. gesamt"));
    return b.join("");
  }

  function recipeCardHtml(r, isSelected) {
    var media = r.image
      ? '<img class="recipe-photo" src="' + r.image + '" alt="' + r.title + '">'
      : '<div class="recipe-photo-placeholder">🍲</div>';
    return (
      '<div class="recipe-card' + (isSelected ? " selected" : "") + '" data-id="' + r.id + '">' +
      '<div class="recipe-media">' + media + '<span class="meal-type-tag">' + mealTypeLabelFor(r) + "</span></div>" +
      "<h4>" + r.title + "</h4>" +
      '<p class="recipe-desc">' + r.short_description + "</p>" +
      '<div class="recipe-meta">' + recipeBadges(r) + "</div>" +
      '<button class="recipe-select" data-toggle="' + r.id + '">' + (isSelected ? "✓ Ausgewählt" : "Auswählen") + "</button>" +
      "</div>"
    );
  }

  function renderResults(wasLoosened) {
    var all = state.mainDishes.concat(state.snackDishes);
    els.recipeGrid.innerHTML = all.map(function (r) {
      return recipeCardHtml(r, state.selectedIds.indexOf(r.id) !== -1);
    }).join("");

    els.recipeGrid.querySelectorAll("[data-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-toggle");
        var idx = state.selectedIds.indexOf(id);
        if (idx === -1) state.selectedIds.push(id); else state.selectedIds.splice(idx, 1);
        var card = btn.closest(".recipe-card");
        card.classList.toggle("selected");
        btn.textContent = card.classList.contains("selected") ? "✓ Ausgewählt" : "Auswählen";
      });
    });

    if (wasLoosened) {
      els.fallbackHint.hidden = false;
      els.fallbackHint.textContent = "Ich habe Deine Auswahl leicht angepasst, damit Du passende Gerichte bekommst.";
    } else {
      els.fallbackHint.hidden = true;
    }

    els.breakfastTip.hidden = state.mealTypes.indexOf("fruehstueck") === -1;
  }

  // ---------- Plan generation ----------

  // Assigns each chosen dish to exactly one meal type (the first one from
  // the natural day order that both the user asked for and the recipe
  // covers), so a dish tagged for several meal types is only counted once.
  function primaryMealTypeFor(recipe) {
    for (var i = 0; i < MEAL_TYPE_ORDER.length; i++) {
      var mt = MEAL_TYPE_ORDER[i];
      if (state.mealTypes.indexOf(mt) !== -1 && recipe.meal_type.indexOf(mt) !== -1) {
        return mt;
      }
    }
    return recipe.meal_type[0];
  }

  // The needed amount per meal type (Tage x Personen) is split evenly across
  // however many dishes were chosen for that meal type, so picking several
  // dishes for the same meal doesn't multiply the total quantity needed.
  function computeScaleFactors(chosen) {
    var groups = {};
    chosen.forEach(function (r) {
      var mt = primaryMealTypeFor(r);
      if (!groups[mt]) groups[mt] = [];
      groups[mt].push(r);
    });

    var factors = {};
    Object.keys(groups).forEach(function (mt) {
      var dishesInGroup = groups[mt];
      var neededPortions = state.days * state.persons;
      var portionsPerDish = neededPortions / dishesInGroup.length;
      dishesInGroup.forEach(function (r) {
        var factor = portionsPerDish / r.servings;
        factor = Math.max(1, Math.round(factor * 2) / 2);
        factors[r.id] = factor;
      });
    });
    return factors;
  }

  function buildPlan() {
    var chosen = state.mainDishes.concat(state.snackDishes).filter(function (r) {
      return state.selectedIds.indexOf(r.id) !== -1;
    });
    if (chosen.length === 0) return;

    var scaleFactors = computeScaleFactors(chosen);
    renderShoppingList(chosen, scaleFactors);
    renderIngredientTips(chosen);
    renderPrepPlan(chosen, scaleFactors);
    renderStorageNotes(chosen);
    showScreen("plan");
  }

  function renderPrepPlan(chosen, scaleFactors) {
    var ordered = chosen.slice().sort(function (a, b) { return b.total_time_min - a.total_time_min; });
    var html = '<p class="hint">Zutaten bereitlegen, dann in dieser Reihenfolge vorbereiten. Die aufwendigeren Gerichte zuerst, damit z. B. der Ofen parallel laufen kann.</p>';
    ordered.forEach(function (r) {
      var factor = scaleFactors[r.id];
      var portions = Math.round(r.servings * factor);
      html += '<div class="plan-block"><h4>' + r.title + " (ergibt " + portions + " Portionen)</h4>";
      html += '<p class="plan-ingredients-label">Zutaten für dieses Gericht:</p><ul class="plan-ingredients">';
      r.ingredients.forEach(function (ing) {
        var rounded = roundForShopping(ing.amount * factor, ing.unit);
        var amountStr = rounded % 1 === 0 ? rounded : rounded.toFixed(1);
        html += "<li>" + amountStr + " " + ing.unit + " " + ing.name + "</li>";
      });
      html += "</ul><ol>";
      r.instructions.forEach(function (step) { html += "<li>" + step + "</li>"; });
      html += "</ol></div>";
    });
    html += '<div class="plan-block"><h4>Zum Schluss</h4><ol><li>Alle Mahlzeiten portionieren, in Boxen verteilen und beschriften.</li></ol></div>';
    els.planSteps.innerHTML = html;
  }

  // Fractional tablespoons/pieces/cans aren't practical to measure, so those
  // units round to whole numbers; g/ml keep some precision but round to a
  // sensible kitchen-scale increment.
  function roundForShopping(amount, unit) {
    if (WHOLE_UNIT_ROUNDING.indexOf(unit) !== -1) {
      return Math.max(1, Math.round(amount));
    }
    if (amount >= 10) return Math.round(amount / 5) * 5;
    return Math.round(amount * 2) / 2;
  }

  function renderShoppingList(chosen, scaleFactors) {
    var merged = {}; // key: normalizedName|unit -> { name, unit, amount, category }
    chosen.forEach(function (r) {
      var factor = scaleFactors[r.id];
      r.ingredients.forEach(function (ing) {
        var key = normalizeName(ing.name) + "|" + ing.unit;
        var amount = ing.amount * factor;
        if (merged[key]) {
          merged[key].amount += amount;
        } else {
          merged[key] = { name: ing.name, unit: ing.unit, amount: amount, category: ing.category };
        }
      });
    });

    var byCategory = {};
    Object.keys(merged).forEach(function (key) {
      var item = merged[key];
      var cat = item.category || "Sonstiges";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    });

    var html = "";
    CATEGORY_ORDER.forEach(function (cat) {
      if (!byCategory[cat]) return;
      var label = CATEGORY_LABELS[cat] || cat;
      html += '<div class="shopping-category"><h4>' + label + "</h4><ul>";
      byCategory[cat].sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (item) {
        var rounded = roundForShopping(item.amount, item.unit);
        var amountStr = rounded % 1 === 0 ? rounded : rounded.toFixed(1);
        html += "<li>" + amountStr + " " + item.unit + " " + item.name + "</li>";
      });
      html += "</ul></div>";
    });
    els.shoppingList.innerHTML = html;
  }

  function renderIngredientTips(chosen) {
    var allTips = storageNotes.zutaten_tipps || [];
    var ingredientNames = [];
    chosen.forEach(function (r) {
      r.ingredients.forEach(function (ing) {
        ingredientNames.push(ing.name.toLowerCase());
      });
    });
    var tips = allTips.filter(function (tip) {
      return ingredientNames.some(function (name) {
        return name.indexOf(tip.match) !== -1;
      });
    });
    if (tips.length === 0) { els.ingredientTips.innerHTML = ""; return; }
    els.ingredientTips.innerHTML =
      '<p class="hint"><strong>Kleine Zutatentipps:</strong></p>' +
      "<ul>" + tips.map(function (t) { return "<li>" + t.text + "</li>"; }).join("") + "</ul>";
  }

  function renderStorageNotes(chosen) {
    var seenCategories = [];
    var html = "";
    chosen.forEach(function (r) {
      if (seenCategories.indexOf(r.storage_category) !== -1) return;
      seenCategories.push(r.storage_category);
      var text = storageNotes[r.storage_category] || storageNotes.pflanzlich_gegart;
      html += '<p class="storage-item"><strong>' + r.title + ":</strong> " + text + "</p>";
    });
    if (chosen.some(function (r) { return r.freezer_friendly; })) {
      html += '<p class="storage-item"><strong>Einfrieren:</strong> ' + storageNotes.freezing_default + "</p>";
    }
    els.storageNotesEl.innerHTML = html;
  }
})();

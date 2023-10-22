import * as wasm from "eveshipfit";

wasm.init();

const esi_fit = {"name": "C3 Ratter : NishEM", "ship_type_id": 29984, "description": "", "items": [{"flag": 125, "quantity": 1, "type_id": 45626}, {"flag": 126, "quantity": 1, "type_id": 45591}, {"flag": 127, "quantity": 1, "type_id": 45601}, {"flag": 128, "quantity": 1, "type_id": 45615}, {"flag": 11, "quantity": 1, "type_id": 22291}, {"flag": 12, "quantity": 1, "type_id": 22291}, {"flag": 13, "quantity": 1, "type_id": 22291}, {"flag": 19, "quantity": 1, "type_id": 41218}, {"flag": 20, "quantity": 1, "type_id": 35790}, {"flag": 21, "quantity": 1, "type_id": 2281}, {"flag": 22, "quantity": 1, "type_id": 15766}, {"flag": 23, "quantity": 1, "type_id": 19187}, {"flag": 24, "quantity": 1, "type_id": 19187}, {"flag": 25, "quantity": 1, "type_id": 35790}, {"flag": 27, "quantity": 1, "type_id": 25715}, {"flag": 28, "quantity": 1, "type_id": 25715}, {"flag": 29, "quantity": 1, "type_id": 25715}, {"flag": 30, "quantity": 1, "type_id": 25715}, {"flag": 31, "quantity": 1, "type_id": 25715}, {"flag": 32, "quantity": 1, "type_id": 25715}, {"flag": 33, "quantity": 1, "type_id": 28756}, {"flag": 92, "quantity": 1, "type_id": 31724}, {"flag": 93, "quantity": 1, "type_id": 31824}, {"flag": 94, "quantity": 1, "type_id": 31378}, {"flag": 5, "quantity": 3720, "type_id": 24492}, {"flag": 5, "quantity": 5472, "type_id": 2679}, {"flag": 5, "quantity": 1, "type_id": 35795}, {"flag": 5, "quantity": 1, "type_id": 35794}, {"flag": 5, "quantity": 8, "type_id": 30486}, {"flag": 5, "quantity": 1, "type_id": 35794}, {"flag": 5, "quantity": 396, "type_id": 24492}]};

const esi_flag_mapping = {
    "cargo": 5,
    "drone_bay": 87,
    "ship_hangar": 90,
    "fleet_hangar": 155,
    "lowslot": [
        11, 12, 13, 14, 15, 16, 17, 18
    ],
    "medslot": [
        19, 20, 21, 22, 23, 24, 25, 26
    ],
    "hislot": [
        27, 28, 29, 30, 31, 32, 33, 34
    ],
    "rig": [
        92, 93, 94
    ],
    "subsystem": [
        125, 126, 127, 128
    ],
}

let dogma_attributes = null;
let dogma_effects = null;
let group_ids = null;
let type_ids = null;
let type_dogma = null;
let attribute_mapping = {};

let current_fit = convert_esi_fit(esi_fit);
fetch_datafiles();

window.get_dogma_attributes = function(type_id) {
    return type_dogma[type_id].dogmaAttributes;
}
window.get_dogma_attribute = function(attribute_id) {
    return dogma_attributes[attribute_id];
}
window.get_dogma_effects = function(type_id) {
    return type_dogma[type_id].dogmaEffects;
}
window.get_dogma_effect = function(effect_id) {
    return dogma_effects[effect_id];
}
window.get_type_id = function(type_id) {
    return type_ids[type_id];
}

async function fetch_datafiles() {
    let start = performance.now();

    let response = await fetch("static/typeDogma.json");
    type_dogma = await response.json();

    response = await fetch("static/groupIDs.json");
    group_ids = await response.json();

    response = await fetch("static/typeIDs.json");
    type_ids = await response.json();

    response = await fetch("static/dogmaEffects.json");
    dogma_effects = await response.json();

    response = await fetch("static/dogmaAttributes.json");
    dogma_attributes = await response.json();

    /* Add for all TypeIDs a CategoryID, to speed up lookups. */
    for (let type_id in type_ids) {
        type_ids[type_id].categoryID = group_ids[type_ids[type_id].groupID].categoryID;
    }

    /* We augment the dogma attributes with some extra attributes we calculate. */
    dogma_attributes[-1] = {
        "name": "alignTime",
        "high_is_good": false,
        "published": true,
    }
    dogma_attributes[-2] = {
        "name": "scanStrength",
        "high_is_good": true,
        "published": true,
    }
    dogma_attributes[-3] = {
        "name": "cpuUsage",
        "high_is_good": true,
        "published": true,
    }
    dogma_attributes[-4] = {
        "name": "powerUsage",
        "high_is_good": true,
        "published": true,
    }

    /* Create a reverse lookup table for dogma attributes. */
    for (let dogma_attribute in dogma_attributes) {
        attribute_mapping[dogma_attributes[dogma_attribute].name] = parseInt(dogma_attribute);
    }

    console.log("Datafiles loaded in ms:", performance.now() - start);
    done_loading();
}

function convert_esi_fit(esi_fit) {
    const fitting = {
        "ship_type_id": esi_fit.ship_type_id,
    };

    for (let type in esi_flag_mapping) {
        if (Array.isArray(esi_flag_mapping[type])) {
            fitting[type] = {};

            for (let index in esi_flag_mapping[type]) {
                let item = esi_fit.items.filter(item => item.flag == esi_flag_mapping[type][index])[0];
                if (item) {
                    fitting[type][index] = item.type_id;
                }
            }
        } else {
            fitting[type] = esi_fit.items.filter(item => item.flag == esi_flag_mapping[type]);
        }
    }

    return fitting;
}

function calculate_ship(ship_fit, skills) {
    const calculator_fit = {
        ship_id: ship_fit.ship_type_id,
        items: [],
    };
    for (let slot in ship_fit) {
        if (slot != "lowslot" && slot != "medslot" && slot != "hislot" && slot != "rig" && slot != "subsystem") continue;

        for (let index in current_fit[slot]) {
            calculator_fit.items.push(current_fit[slot][index]);
        }
    }

    const start = performance.now();
    const result = wasm.calculate(calculator_fit, skills);
    console.log("Calculated in ms:", performance.now() - start);

    return result;
}

function load_skills(level) {
    let skills = {};

    for (let item_id in type_ids) {
        if (type_ids[item_id].categoryID != 16) continue;
        if (!type_ids[item_id].published) continue;

        skills[item_id] = level;
    }

    return skills;
}

function done_loading() {
    const skills = load_skills(5);
    let calculation = calculate_ship(current_fit, skills);

    let slot_modifier = {
        "hiSlots": 0,
        "medSlots": 0,
        "lowSlots": 0,
    };

    for (let item of calculation.items) {
        slot_modifier["hiSlots"] += item.attributes.get(attribute_mapping["hiSlotModifier"])?.value || 0;
        slot_modifier["medSlots"] += item.attributes.get(attribute_mapping["medSlotModifier"])?.value || 0;
        slot_modifier["lowSlots"] += item.attributes.get(attribute_mapping["lowSlotModifier"])?.value || 0;
    }

    function render_slots(slot_type, atribute_name) {
        const slots = current_fit[slot_type];

        const slot_divs = document.querySelectorAll("[data-" + slot_type + "]");
        const maxSlots = (calculation.hull.attributes.get(attribute_mapping[atribute_name])?.value || 0) + (slot_modifier[atribute_name] || 0);
        for (let slot_div of slot_divs) {
            if (slot_div.dataset[slot_type] > maxSlots) {
                slot_div.style.display = "none";
            } else {
                slot_div.style.display = "block";

                const type_id = slots[slot_div.dataset[slot_type] - 1];
                if (type_id) {
                    const slot_inner = slot_div.querySelector(".slot-inner");
                    slot_inner.innerHTML = "<img src=\"https://images.evetech.net/types/" + type_id + "/icon?size=64\" title=\"" + type_ids[type_id].name + "\" />";
                }
            }
        }
    }

    render_slots("hislot", "hiSlots");
    render_slots("medslot", "medSlots");
    render_slots("lowslot", "lowSlots");
    render_slots("rig", "upgradeSlotsLeft");
    render_slots("subsystem", "maxSubSystems");

    document.getElementById("hull-inner").innerHTML = "<img src=\"https://images.evetech.net/types/" + current_fit.ship_type_id + "/render?size=512\" />";

    /* Check all span elements with a data-attribute on them, and replace it with the ships stats. */
    let spans = document.getElementsByTagName("span");
    for (let span of spans) {
        let attribute = span.dataset.attribute;
        if (attribute == null) continue;

        let value;
        let high_is_good;

        value = calculation.hull.attributes.get(parseInt(attribute)).value;
        high_is_good = dogma_attributes[attribute].high_is_good;

        if (span.dataset.resistance !== undefined) {
            value = 100 - value * 100;
            high_is_good = !high_is_good;
        }

        if (span.dataset.divide !== undefined) {
            value /= span.dataset.divide;
        }

        const k = Math.pow(10, span.dataset.fixed);

        if (k > 0) {
            if (high_is_good) {
                value -= 1 / k / 10;
                value = Math.ceil(value * k) / k;
            } else {
                value += 1 / k / 10;
                value = Math.floor(value * k) / k;
            }
        }

        span.innerHTML = value.toLocaleString("en", {
            minimumFractionDigits: span.dataset.fixed,
            maximumFractionDigits: span.dataset.fixed,
        });
    }

    let stats = "";

    function print_local_effects(effects) {
        stats += "Local effects: <ul>";
        for (let effect of effects) {
            stats += "<li>" + dogma_effects[effect].effectName + "</li>";
        }
        stats += "</ul>";
    }

    function print_attributes(attributes) {
        stats += "<table>";

        for (let [key, attribute] of attributes) {
            // Hide attributes CCP deemed not needed to see for us mere mortals.
            if (!dogma_attributes[key].published) continue;
            // Hide attributes that are on default value and have no effects applied.
            if (attribute.value == dogma_attributes[key].defaultValue && attribute.effects.length == 0) continue;

            let effects = "<ul>";
            for (let effect of attribute.effects) {
                effects += "<li>" + JSON.stringify(effect) + "</li>";
            }
            effects += "</ul>";

            stats += "<tr><td>" + key + ": " + dogma_attributes[key].name + "</td><td>" + attribute.base_value + "</td><td>" + attribute.value + "</td><td>" + effects + "</td></tr>";
        }

        stats += "</table>";
    }

    stats += "<h2>" + type_ids[calculation.hull.type_id].name + "</h2>";
    print_local_effects(calculation.hull.effects);
    print_attributes(calculation.hull.attributes);

    for (let item of calculation.items) {
        stats += "<h3>" + type_ids[item.type_id].name + "</h3>";
        print_local_effects(item.effects);
        print_attributes(item.attributes);
    }

    let ship_stats = document.getElementById("ship-stats");
    ship_stats.innerHTML = stats;
}

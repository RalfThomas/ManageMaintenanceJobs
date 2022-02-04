sap.ui.define([], function() {
    "use strict";
    return Object.freeze({

        INITIAL_DRAFT_UUID: "00000000-0000-0000-0000-000000000000",

        ATTACHMENT_SERVICE: {
            COMPONENT_NAME: "zi2d.eam.malfunction.manages1.component.attachment",
            OBJECT_TYPES: {
                NOTIFICATION: "PMQMEL"
            },
            MODE: {
                CREATE: "I",
                CHANGE: "C",
                DISPLAY: "D"
            },
            STATUS: {
                UPLOADCOMPLETED: "UPLOADCOMPLETED",
                RENAMECOMPLETED: "RENAMECOMPLETED"
            }
        },
        MATERIAL_SEARCH_TABS: {
            ALL_MATERIALS: "AllMaterials",
            BILL_OF_MATERIAL: "BillOfMaterial",
            HISTORY: "History"
        },
        AVAILABILITY: {
            AVAILABLE: "A",
            NOT_AVAILABLE: "B",
            UNKNOWN: "C"
        }
    });
}, false);
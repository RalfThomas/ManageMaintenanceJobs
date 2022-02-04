sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/Filter",
    "zi2d/eam/malfunction/manages1/util/Constants"
], function(BaseObject, Filter, Constants) {
    "use strict";
    return BaseObject.extend("zi2d.eam.malfunction.manages1.util.Notification", {

        constructor: function() {},

        extractOrderandNotification: function(oJobKeysContext) {
            var oJobKeys = {};
            if (oJobKeysContext.hasOwnProperty("sPath")) {
                oJobKeys.MaintenanceOrder = oJobKeysContext.getProperty("MaintenanceOrder");
                oJobKeys.MaintenanceNotification = oJobKeysContext.getProperty("MaintenanceNotification");
            } else {
                oJobKeys.MaintenanceOrder = oJobKeysContext.MaintenanceOrder;
                oJobKeys.MaintenanceNotification = oJobKeysContext.MaintenanceNotification;
            }
            return oJobKeys;
        },

        isEditable: function(oData) {
            return (oData.NotifProcessingPhase < 4);
        },

        _createBindingContext: function(oModel, sEntity, oKey) {
            return new Promise(function(resolve) {
                oModel.createBindingContext(oModel.createKey(sEntity, oKey), function(oBindingContext) {
                    resolve(oBindingContext);
                });
            });
        },

        createTechnicalObjectBindingContext: function(oModel, sTechnicalObject, sTechObjIsEquipOrFuncnlLoc) {
            return this._createBindingContext(oModel, "/ZI_TechnicalObjectType", {
                TechnicalObject: sTechnicalObject,
                TechObjIsEquipOrFuncnlLoc: sTechObjIsEquipOrFuncnlLoc
            });
        },

        createNotificationBindingContext: function(oModel, sMaintenanceNotification, sDraftUUID, bIsActiveEntity) {
            return this._createBindingContext(oModel, "/C_MaintNotificationTP", {
                DraftUUID: sDraftUUID,
                MaintenanceNotification: sMaintenanceNotification,
                IsActiveEntity: bIsActiveEntity
            });
        },

        createNotificationItemBindingContext: function(oModel, sMaintenanceNotification, sMaintenanceNotificationItem, sDraftUUID,
            bIsActiveEntity) {
            return this._createBindingContext(oModel, "/C_MaintNotificationItemTP", {
                MaintenanceNotificationItem: sMaintenanceNotificationItem,
                MaintenanceNotification: sMaintenanceNotification,
                DraftUUID: sDraftUUID,
                IsActiveEntity: bIsActiveEntity
            });
        },

        getAssignedOrder: function(oModel, sMaintenanceOrder) {
            var sKey = oModel.createKey("/ZC_MaintOrderTP", {
                MaintenanceOrder: sMaintenanceOrder
            });
            return new Promise(function(resolve) {
                oModel.createBindingContext(sKey, resolve);
            });
        },

        getNumberOfCurrentNotifications: function(oModel, sTechnicalObject, sTechObjIsEquipOrFuncnlLoc) {
            return this._getNumberOfNotifications(oModel, this.getCurrentTechnicalObjectsFilters(true, sTechnicalObject,
                sTechObjIsEquipOrFuncnlLoc, [1, 2, 3]));
        },

        getNumberOfHistoricNotifications: function(oModel, sTechnicalObject, sTechObjIsEquipOrFuncnlLoc) {
            return this._getNumberOfNotifications(oModel, this.getCurrentTechnicalObjectsFilters(true, sTechnicalObject,
                sTechObjIsEquipOrFuncnlLoc, [4, 5]));
        },

        _getNumberOfNotifications: function(oModel, aFilters) {
            return new Promise(function(resolve) {
                oModel.read("/C_MaintNotificationTP/$count", {
                    filters: aFilters,
                    success: function(sCount) {
                        return resolve(sCount);
                    }
                });
            });
        },

        getCurrentTechnicalObjectsFilters: function(bActiveEntity, sTechnicalObject, sTechObjIsEquipOrFuncnlLoc, aNotificationPhases) {
            var aFilters = [
                new Filter({
                    path: "IsActiveEntity",
                    operator: "EQ",
                    value1: bActiveEntity
                }), new Filter({
                    path: "TechnicalObject",
                    operator: "EQ",
                    value1: sTechnicalObject
                }), new Filter({
                    path: "TechObjIsEquipOrFuncnlLoc",
                    operator: "EQ",
                    value1: sTechObjIsEquipOrFuncnlLoc
                })
            ];
            if (Array.isArray(aNotificationPhases)) {
                aNotificationPhases.forEach(function(sPhase) {
                    aFilters.push(new Filter({
                        path: "NotifProcessingPhase",
                        operator: "EQ",
                        value1: sPhase
                    }));
                });
            }
            return aFilters;
        },

        /**
         * Create Child Draft for a certain Parent Entity
         * @param {Object} oParams - Parameters Object for Create.
         * @param {sap.ui.generic.app.ApplicationController} oParams.oApplicationController - Application Controller.
         * @param {string} oParams.sEntitySet - Parent Entity set.
         * @param {string} oParams.sChildNavigationProperty - Navigation property pointing to Child Entity.
         * @param {Object} oParams.oParentBindingContext - Binding Context of Parent Entity.
         */
        createChildDraft: function(oParams) {
            return new Promise(function(resolve, reject) {
                var oDraftController = oParams.oApplicationController.getTransactionController().getDraftController();
                oDraftController.createNewDraftEntity(oParams.sEntitySet, oParams.oParentBindingContext.getPath() +
                    "/" + oParams.sChildNavigationProperty).then(function(
                    oMaintNotifCauseDraft) {
                    resolve(oMaintNotifCauseDraft);
                }).catch(function() {
                    reject();
                });
            });
        },

        /**
         * Read the Child Entities for a certain Parent Entity
         * @param {Object} oParams - Parameters Object for Read.
         * @param {Object} oParams.oModel - OData V2 Model.
         * @param {Object} oParams.oParentBindingContext - Binding Context of Parent Entity.
         * @param {string} oParams.sNavigationProperty - Navigation property pointing to Child Entity.
         * @param {Object[]} oParams.aSorters - Sort parameters.
         * @param {Object[]} oParams.aFilters - Filter parameters.
         */
        readChildNodes: function(oParams) {
            return new Promise(function(resolve, reject) {
                oParams.oModel.read(oParams.oParentBindingContext.sPath + "/" + oParams.sNavigationProperty, {
                    sorters: (oParams.aSorters) ? oParams.aSorters : "",
                    filters: (oParams.aFilters) ? oParams.aFilters : "",
                    success: function(oData) {
                        if (!oData.results || oData.results.length === 0) {
                            reject();
                        } else {
                            resolve(oData.results);
                        }
                    },
                    error: function() {
                        reject();
                    }
                });
            });
        }

    });
});
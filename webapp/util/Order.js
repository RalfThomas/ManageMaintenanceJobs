sap.ui.define([
    "sap/ui/base/Object",
    "zi2d/eam/malfunction/manages1/util/Constants",
    "zi2d/eam/malfunction/manages1/util/OData"
], function(BaseObject, Constants, ODataUtil) {
    "use strict";
    return BaseObject.extend("zi2d.eam.malfunction.manages1.util.Order", {

        _oModel: null,
        _oODataUtil: null,

        constructor: function(oModel) {
            this.setModel(oModel);
        },

        isEditable: function(oData) {
            return (oData.MaintenanceProcessingPhase < 3);
        },

        createFilterForNotFinallyConfirmedOperations: function(sMaintenanceOrder) {
            return [new sap.ui.model.Filter("MaintenanceOrder", sap.ui.model.FilterOperator.EQ, sMaintenanceOrder),
                    new sap.ui.model.Filter("IsActiveEntity", sap.ui.model.FilterOperator.EQ, true),
                    new sap.ui.model.Filter("IsFinallyConfirmed", sap.ui.model.FilterOperator.EQ, false)
                ]
                // add in filter for not confirmable operations (based on control key)
                .concat(this._oODataUtil.entityTypeHasField("ZC_MaintOrderOperationTP", "ConfirmationIsNotPossible") ? [
                    new sap.ui.model.Filter("ConfirmationIsNotPossible", sap.ui.model.FilterOperator.EQ, false)
                ] : /* empty array if filter field not available: */ []);
        },

        getNumberOfOperationsWithPendingConfirmation: function(oModel, sMaintenanceOrder) {
            var that = this;

            return new Promise(function(resolve, reject) {
                oModel.read("/ZC_MaintOrderOperationTP/$count", {
                    filters: that.createFilterForNotFinallyConfirmedOperations(sMaintenanceOrder),
                    success: function(sCount) {
                        resolve(sCount);
                    },
                    error: reject
                });
            });
        },

        confirmTechnicalCompletionClosesOperations: function(oView, oModel, mActionData) {
            var sMaintenanceOrder = mActionData.StatusObject.replace(/^OR0+/, ""),
                oI18nBundle = oView.getModel("i18n").getResourceBundle(),
                that = this;

            if (!this._oModel) {
                this.setModel(oView.getModel());
            }

            oView.getModel("app").setProperty("/isBusy", true);

            return this.getNumberOfOperationsWithPendingConfirmation(oModel, sMaintenanceOrder)
                .then(function(sCount) {
                    if (parseInt(sCount) === 0) {
                        return Promise.resolve();
                    }

                    return new Promise(function(resolve, reject) {
                        var oItemList = new sap.m.List({
                            items: {
                                path: "/ZC_MaintOrderOperationTP",
                                parameters: {
                                    expand: "to_PersonResponsible",
                                    select: "OperationDescription,MaintenanceOrderOperation,OperationPersonResponsible,to_PersonResponsible/EmployeeFullName"
                                },
                                sorter: [new sap.ui.model.Sorter("IsFinallyConfirmed", false, true)],
                                filters: that.createFilterForNotFinallyConfirmedOperations(sMaintenanceOrder),
                                groupHeaderFactory: function() {
                                    return new sap.m.GroupHeaderListItem({
                                        title: "{i18n>xtit.pendingFinalConfirmation}"
                                    });
                                },
                                template: new sap.m.StandardListItem({
                                    title: "{OperationDescription}",
                                    description: "{to_PersonResponsible/EmployeeFullName}"
                                })
                            }
                        });

                        var oDialog = new sap.m.Dialog({
                            contentWidth: "25rem",
                            title: mActionData.EAMOvrlStsEventConfiguration_Text,
                            type: sap.m.DialogType.Message,
                            content: [new sap.ui.layout.VerticalLayout({
                                content: [
                                    new sap.m.Text({
                                        text: oI18nBundle.getText("ymsg.workItemsWillBeSetToFinallyConfirmed", [sCount])
                                    }),
                                    new sap.m.Link({
                                        text: oI18nBundle.getText("xlnk.showDetails"),
                                        press: function(oEvent) {
                                            var oEventSource = oEvent.getSource();
                                            oEventSource.setVisible(false);
                                            oDialog.setStretch(oView.getModel("device").getProperty("/system/phone"));
                                            oDialog.addContent(oItemList);
                                        }
                                    }).addStyleClass("sapUiSmallMarginTop")
                                ]
                            })],
                            beginButton: new sap.m.Button({
                                text: mActionData.EAMOvrlStsEventConfiguration_Text,
                                press: function() {
                                    resolve();
                                    oDialog.close();
                                }
                            }),
                            endButton: new sap.m.Button({
                                text: "{i18n>xbut.cancel}",
                                press: function() {
                                    reject(false);
                                    oDialog.close();
                                }
                            })
                        });
                        oView.addDependent(oDialog);
                        oView.getModel("app").setProperty("/isBusy", false);
                        oDialog.open();
                    });
                });
        },

        createOrderOperationComponent: function(oModel, oComponent) {
            return new Promise(function(resolve, reject) {
                oModel.callFunction("/ZC_MaintOrderOperationTPCreate_component", {
                    method: "POST",
                    urlParameters: {
                        MaintenanceOrder: oComponent.MaintenanceOrder,
                        MaintenanceOrderOperation: oComponent.MaintenanceOrderOperation,
                        DraftUUID: Constants.INITIAL_DRAFT_UUID,
                        Material: oComponent.Material,
                        Baseunit: (oComponent.MaterialBaseUnit) ? oComponent.MaterialBaseUnit : "",
                        Requirementquantityinbaseunit: (oComponent.RequirementQuantityInBaseUnit) ? oComponent.RequirementQuantityInBaseUnit : 1,
                        IsActiveEntity: true,
                        Plant: (oComponent.Plant) ? oComponent.Plant : "",
                        Storagelocation: (oComponent.StorageLocation) ? oComponent.StorageLocation : ""
                    },
                    success: function() {
                        resolve();
                    },
                    error: function() {
                        reject();
                    }
                });
            });
        },

        setModel: function(oModel) {
            if (oModel) {
                this._oModel = oModel;
                this._oODataUtil = new ODataUtil(oModel);
            }
        }

    });
});
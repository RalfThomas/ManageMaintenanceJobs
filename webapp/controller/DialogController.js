sap.ui.define([
    "./BaseController",
    "sap/ui/generic/app/ApplicationController",
    "sap/ui/core/routing/History",
    "sap/ui/core/routing/HashChanger",
    "sap/m/MessageBox",
    "../model/formatter"
], function(BaseController, ApplicationController, History, HashChanger, MessageBox, formatter) {
    "use strict";

    return BaseController.extend("zi2d.eam.malfunction.manages1.controller.DialogController", {

        _oApplicationController: null,
        _bIsCancelled: false,
        sDialogId: null,
        aAssociations: null,
        _sSmartFormId: null,
        formatter: formatter,

        registerAdditionalAssociation: function(sAssociationPath) {
            if (!$.isArray(this.aAssociations)) {
                this.aAssociations = [];
            }

            this.aAssociations.push(sAssociationPath);
        },

        parentContextAvailable: function() {
            var that = this;
            return new Promise(function(resolve, reject) {
                if (that.getView().getBindingContext() === undefined) {
                    that.getView().getParent().getParent().getObjectBinding().attachDataReceived(function() {
                        resolve();
                    });
                } else {
                    // can resolve right away, no need to wait
                    resolve();
                }
            });
        },

        initializeDraftDialog: function(sDialogId, oContext, sSmartFormId) {
            var that = this;

            this._sSmartFormId = sSmartFormId;
            this.sDialogId = sDialogId;
            this._bIsCancelled = false;

            HashChanger.getInstance().attachEventOnce("hashChanged", this._onHashChanged, this);

            this._setup();
            this._setupDialog();

            if (oContext.getProperty("IsActiveEntity") === true) {
                this.getModel("app").setProperty("/isBusy", true);

                return (function() {
                        return Promise.resolve(false);
                    })()
                    .catch(function() {
                        return Promise.reject(false);
                    })
                    .then(function(bDiscardExisting) {}).then(function(oResponse) {
                        return new Promise(function(resolve, reject) {
                            that.getModel("app").setProperty("/isBusy", false);
                            if (that._bIsCancelled === false) {
                                that.getView().setBindingContext(oResponse.context);
                                that.getView().byId(sDialogId).open();
                                resolve(oResponse);
                            } else {
                                reject(false);
                            }
                        });
                    })
                    .catch(jQuery.proxy(this.onError, this, true));
            } else {
                return new Promise(function(resolve, reject) {
                    that.getView().setBindingContext(oContext);
                    that.getView().byId(sDialogId).open();
                    resolve();
                });
            }
        },

        leaveDialog: function() {
            var sMaintenanceNotification = this.getView().getParent().getBindingContext().getProperty("MaintenanceNotification");
            var sMaintenanceOrderOperation = this.getView().getBindingContext().getObject().MaintenanceOrderOperation;

            if (!sMaintenanceNotification) {
                return;
            }

            this.getRouter().navTo("displayJob", {
                MaintenanceNotification: sMaintenanceNotification,
                MaintenanceOrderOperation: sMaintenanceOrderOperation
            }, true);
        },

        onError: function(bLeaveDialog) {
            // overloading BaseController method
            var bLeave = false,
                aArguments = arguments;

            if (typeof bLeaveDialog === "boolean" && bLeaveDialog === true) {
                bLeave = true;
                aArguments = jQuery.makeArray(arguments).slice(1);
            }

            this.attachEventOnce("errorMessageDialogClosed", function() {
                this.getModel("app").setProperty("/isDialogBusy", false);
                if (bLeave) {
                    this.leaveDialog();
                }
            }, this);

            BaseController.prototype.onError.apply(this, aArguments);
        },

        _onOkPressed: function(oEvent) {
            var that = this;

            if (this.getModel("app").getProperty("/isDialogBusy") === true) {
                return Promise.reject();
            }

            var oSmartForm = this.getView().byId(this._sSmartFormId);
            if (oSmartForm && oSmartForm.check() && oSmartForm.check().length > 0) {
                return null; // error in one of the fields
            }

            this.getModel("app").setProperty("/isDialogBusy", true);

            sap.ui.getCore().getMessageManager().removeAllMessages();

            var oObject = this.getView().getBindingContext().getObject();
            var sFunctionImport = this.getView().getModel("FunctionImportModel").getProperty("/FunctionImport");
            if (sFunctionImport === "EditHeader") {
                this._CallFunction("/EditHeader", "POST", {
                    "MaintenanceNotification": oObject.MaintenanceNotification,
                    "NotificationCreationDate": oObject.NotificationCreationDate,
                    "NotificationCreationTime": oObject.NotificationCreationTime,
                    "NotificationText": oObject.NotificationText,
                    "ReportedByUser": oObject.ReportedByUser
                });
            } else if (sFunctionImport === "ChangeOrderOperation") {
                this._CallFunction("/ChangeOrderOperation", "POST", {
                    "MaintenanceOrder": oObject.MaintenanceOrder,
                    "MaintenanceOrderOperation": oObject.MaintenanceOrderOperation,
                    "OperationDescription": oObject.OperationDescription,
                    "OperationPersonResponsible": oObject.OperationPersonResponsible,
                    "OperationWorkCenter": oObject.OperationWorkCenter,
                    "OperationPlannedWork": oObject.OperationPlannedWork,
                    "OperationPlannedWorkUnit": oObject.OperationPlannedWorkUnit,
                    "Plant": oObject.Plant
                });
            } else if (sFunctionImport === "ChangeOrderComponent") {
                this._CallFunction("/ChangeOrderComponent", "POST", {
                    "Baseunit": oObject.BaseUnit,
                    "MaintenanceOrder": oObject.MaintenanceOrder,
                    "MaintenanceOrderOperation": oObject.MaintenanceOrderOperation,
                    "MaintenanceOrderComponent": oObject.MaintOrderComponentForEdit,
                    "Material": oObject.Material,
                    "Requirementquantityinbaseunit": oObject.RequirementQuantityInBaseUnit,
                    "Storagelocation": oObject.StorageLocation,
                    "Plant": oObject.Plant
                });
            }
        },

        _onCancelPressed: function(oEvent) {
            if (this.getModel("app").getProperty("/isDialogBusy") === true) {
                return;
            }
            this.getModel("app").setProperty("/isBusy", false);
            this.getOwnerComponent().getModel().resetChanges();

            var oHistory = History.getInstance();
            if (oHistory.getPreviousHash() !== undefined) {
                window.history.back(-1);
            } else {
                // no more history -- attempt to leave app
                // leaving app should only happen after the draft was deleted.
                // otherwise, the DELETE request might be cancelled.
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

                oCrossAppNavigator.toExternal({
                    target: {
                        shellHash: "#"
                    }
                });
            }

        },

        /**
         *	Discards current draft, after user confirmed. Confirmation prompt is not shown for dialogs.
         *	@param {sap.ui.core.Element} oControl Related control for popover. Usually the "Cancel" button. 
         *  @param {boolean} bCreateDraft Indicator whether the popover is triggered for a create or edit draft.
         *	@param {boolean} bIsInDialog Indicator whether called from dialog
         *  @returns {Promise}
         */
        confirmDiscardDraft: function(oControl, bCreateDraft, bIsInDialog) {
            var that = this;

            return new Promise(function(resolve, reject) {
                if (bIsInDialog) {
                    resolve();
                    return;
                }

                var oPopover = new sap.m.Popover({
                    placement: sap.m.PlacementType.VerticalPreferedTop,
                    showHeader: false,
                    content: [
                        new sap.ui.layout.VerticalLayout({
                            content: [
                                new sap.m.Text({
                                    text: "{i18n>ymsg.confirmDraftDeletion}",
                                    width: "16rem"
                                }),
                                new sap.m.Button({
                                    text: "{i18n>xbut.discard}",
                                    width: "100%",
                                    press: resolve
                                })
                            ]
                        })
                    ],
                    afterClose: function() {
                        oControl.removeDependent(oPopover);
                        oPopover.destroy();
                    }
                }).addStyleClass("sapUiContentPadding");

                oControl.addDependent(oPopover);
                oPopover.openBy(oControl);
            }).then(function() {

                var oHistory = History.getInstance();
                if (oHistory.getPreviousHash() !== undefined) {
                    window.history.back(-1);
                } else {
                    // no more history -- attempt to leave app
                    // leaving app should only happen after the draft was deleted.
                    // otherwise, the DELETE request might be cancelled.
                    var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

                    oCrossAppNavigator.toExternal({
                        target: {
                            shellHash: "#"
                        }
                    });
                }
            });
        },

        discard: function(oContext) {
            var that = this;

            this.oContext = oContext;

            return this._loadRootEntity()
                .then(function(oContextToDiscard) {
                    return that._oApplicationController.getTransactionController().deleteEntity(oContextToDiscard);
                });
        },

        _onHashChanged: function() {
            var oDialog = this.getView().byId(this.sDialogId);

            if (!oDialog || !oDialog.isOpen()) {
                this._bIsCancelled = true;
            } else {
                oDialog.close();
            }
        },

        _setup: function() {
            if (!this._oApplicationController) {
                this._oApplicationController = new ApplicationController(this.getModel(), this.getView());

                sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
            }
        },

        _setupDialog: function() {
            var oDialog = this.getView().byId(this.sDialogId);

            if (!oDialog.getBeginButton()) {
                // Button IDs must be Dialog dependent otherwise this will lead
                // to a duplicate ID error (see Internal Incident 1880415740)
                var sSaveButtonId = this.sDialogId + "-malfuncManageSaveDialogButton";
                oDialog.setBeginButton(new sap.m.Button({
                    id: sSaveButtonId,
                    type: sap.m.ButtonType.Emphasized,
                    press: this._onOkPressed.bind(this),
                    text: "{i18n>xbut.save}",
                    tooltip: "{i18n>xbut.save}"
                }));
            }

            if (!oDialog.getEndButton()) {
                var sCancelButtonId = this.sDialogId + "-malfuncManageCancelDialogButton";
                oDialog.setEndButton(new sap.m.Button({
                    id: sCancelButtonId,
                    press: this._onCancelPressed.bind(this),
                    text: "{i18n>xbut.cancel}",
                    tooltip: "{i18n>xbut.cancel}"
                }));
            }

            oDialog.attachAfterClose(function() {
                delete this.aAssociations;
            }, this);

            oDialog.bindProperty("busy", "app>/isDialogBusy");
        },

        _getParentContextPromise: function() {
            var that = this;
            return new Promise(function(resolve, reject) {
                if (that.getView().getBindingContext() === undefined) {
                    that.getView().getParent().getParent().getObjectBinding().attachDataReceived(function() {
                        resolve();
                    });
                } else {
                    // can resolve right away, no need to wait
                    resolve();
                }
            });
        },

        _CallFunction: function(sPath, sMethod, oUrlParam) {
            var that = this;
            var oModel = this.getView().getModel();

            var oErg = {};
            oModel.callFunction(sPath, {
                method: sMethod,
                urlParameters: oUrlParam,
                success: function(oData, test) {

                    that.getModel("app").setProperty("/isDialogBusy", false);
                    that.leaveDialog();
                    that.showMessages();
                    if (oData) {
                        that._refreshAfterChange(oModel);

                        // sap.m.MessageBox.success(
                        //     "Erfolg", {
                        //         details: test
                        //     }
                        // );

                    }
                },
                error: function(oResponse) {
                    that._refreshAfterChange(oModel);
                    that.getModel("app").setProperty("/isDialogBusy", false);
                    that.leaveDialog();
                    that._oDataServiceErrorHandling(oResponse);
                    that.onError.bind(that);
                }
            });

        },

        _oDataServiceErrorHandling: function(oResponse) {

            var sMessage = oResponse.message;
            var sDetails = oResponse.responseText;
            try {
                var msg = JSON.parse(oResponse.responseText);
                sMessage = msg.error.message.value;
                sap.m.MessageBox.error(
                    sMessage
                );
            } catch (err) {
                sap.m.MessageBox.error(
                    sMessage, {
                        details: sDetails
                    }
                );
            }
        },

        _refreshAfterChange: function(oModel) {
            oModel.refresh(true);
        }

    });

});
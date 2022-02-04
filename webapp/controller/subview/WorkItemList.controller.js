sap.ui.define([
    "zi2d/eam/malfunction/manages1/controller/BaseController",
    "sap/ui/generic/app/ApplicationController",
    "sap/m/MessageBox",
    "zi2d/eam/malfunction/manages1/util/Notification"
], function(BaseController, ApplicationController, MessageBox, Notification) {
    "use strict";
    return BaseController.extend("zi2d.eam.malfunction.manages1.controller.subview.WorkItemList", {
        _sMaintenanceNotification: null,
        _sMaintenanceOrder: null,
        _oSmartTable: null,
        _oNotificationUtil: null,

        onInit: function() {
            this._oSmartTable = this.getView().byId("malfuncManageWorkItemTable");

            this.getView().attachModelContextChange(this.onModelContextChange, this);
            this.getRouter().getRoute("displayJob").attachPatternMatched(this.onDisplayJobRouteMatched, this);
            this._oNotificationUtil = new Notification();

        },

        onModelContextChange: function() {
            var that = this;
            this.getOwnerComponent().getModel().metadataLoaded()
                .then(this.getNotification.bind(this))
                .then(function(oJobKeysContext) {
                    var oJobKeys = that._oNotificationUtil.extractOrderandNotification(oJobKeysContext);
                    that._updateOrderAndNotificationNumber(oJobKeys.MaintenanceOrder, oJobKeys.MaintenanceNotification);
                });
        },

        onDisplayJobRouteMatched: function(oEvent) {
            // due to the association binding, UI5 doesn't understand when the operation(s) change

            if (oEvent.getParameter("arguments").MaintenanceNotification !== this._sMaintenanceNotification) {
                // modelContextChange event will handle the switch to a different notification
                return;
            }

            if (this._sMaintenanceOrder === "") {
                // return from creating first operation
                var oBindingContext = this.getView().getBindingContext();
                if (oBindingContext) {
                    var sOrder = oBindingContext.getProperty("MaintenanceOrder");
                    if (sOrder) {
                        // now, there is an order number.
                        this._updateOrderAndNotificationNumber(sOrder, this._sMaintenanceNotification);
                        return;
                    }
                }
            }

            if (this._sMaintenanceOrder && this._sMaintenanceNotification) {
                this._oSmartTable.rebindTable();
            }
        },

        onDeleteWorkItemPressed: function(oEvent) {
            var that = this;
            this.getView().getModel("FunctionImportModel").setProperty("/FunctionImport", "DeleteOrderOperation");

            var oMaintOrderOperWorkBindingContext = oEvent.getSource().getBindingContext();
            if (!oMaintOrderOperWorkBindingContext) {
                return;
            }

            // User has to confirm deletion before Work Entity is deleted
            that.showDeletionConfirmationDialog(oMaintOrderOperWorkBindingContext.getObject().OperationDescription, that.getI18nBundle().getText(
                "ymsg.deleteWork")).then(function() {
                that._CallFunction("/DeleteOrderOperation", "POST", {
                    "MaintenanceOrder": oMaintOrderOperWorkBindingContext.getObject().MaintenanceOrder,
                    "MaintenanceOrderOperation": oMaintOrderOperWorkBindingContext.getObject().MaintenanceOrderOperation
                });
            });
        },

        onEditWorkItemPressed: function(oEvent) {
            this.getModel("app").setProperty("/isDialogBusy", true);
            var oSourceData = oEvent.getSource().getBindingContext().getObject();
            this.getView().getModel("FunctionImportModel").setProperty("/FunctionImport", "ChangeOrderOperation");

            var that = this;
            var oModel = this.getView().getModel();
            //Long Text
            this.getModel("KommentarModel").setProperty("/OperationLongText", "");

            oModel.callFunction("/GetOperationLongText", {
                method: "POST",
                urlParameters: {
                    MaintenanceOrder: oSourceData.MaintenanceOrder,
                    MaintenanceOrderOperation: oSourceData.MaintenanceOrderOperation
                },
                success: function(oData, test) {

                    if (oData) {

                        that.getModel("KommentarModel").setProperty("/OperationLongText", oData.MaintOperationLongText);
                        that.getModel("app").setProperty("/isDialogBusy", false);
                    }
                },
                error: function(oResponse) {
                    that.getModel("app").setProperty("/isDialogBusy", false);
                }
            });


            this.getRouter().navTo("editWorkItem", {
                "MaintenanceNotification": this._sMaintenanceNotification,
                "MaintenanceOrder": oSourceData.MaintenanceOrder,
                "MaintenanceOrderOperation": oSourceData.MaintenanceOrderOperation
            });

        },

        onAddWorkItemPressed: function(oEvent) {
            var that = this,
                oModel = this.getModel();

            this.getView().getModel("FunctionImportModel").setProperty("/FunctionImport", "CreateOrderOperation");
            this.getView().getModel("appView").setProperty("/Plant", oEvent.getSource().getBindingContext().getObject().MaintenanceWorkCenterPlant);

            var oModel = this.getView().getModel();

            var oDialog = sap.ui.xmlfragment("zi2d.eam.malfunction.manages1.view.fragment.CreateOrderOperation", jQuery.extend({}, this, {
                afterDialogClosed: function() {
                    this.getView().removeDependent(oDialog);
                    oDialog.destroy(true);
                },
                onCancelPressed: function() {
                    oDialog.close();
                    if (oModel.hasPendingChanges()) {
                        oModel.resetChanges();
                    }
                },
                onCreateOrderOperation: function() {

                    var sOperationWorkCenter = this.getView().getModel("appView").getProperty("/OperationWorkCenter");
                    if (!sOperationWorkCenter || sOperationWorkCenter === "") {
                        MessageBox.error(that.getI18nBundle().getText("ymsg.mandantory"));
                        return;
                    } else {

                        oDialog.close();

                        this._CallFunction("/CreateOrderOperation", "POST", {
                            "MaintenanceOrder": oEvent.getSource().getBindingContext().getObject().MaintenanceOrder,
                            "OperationDescription": this.getView().getModel("appView").getProperty("/OperationDescription"),
                            "OperationPersonResponsible": "",
                            "OperationWorkCenter": sOperationWorkCenter,
                            "Plant": this.getView().getModel("appView").getProperty("/Plant")
                        });

                        this.resetAppView();

                    }
                }
            }));

            oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
            oDialog.setModel(oModel);
            this.getView().addDependent(oDialog);

            oDialog.open();

        },

        onCreateTimeConfirmation: function(oEvent) {
            var oModel = this.getView().getModel(),
                oZEAM_OBJPG_MAINTORDANDOPER_Model = this.getView().getModel("ZEAM_OBJPG_MAINTORDANDOPER_SRV"),
                oi18n = this.getView().getModel("@i18n").getResourceBundle(),
                oContext = oEvent.getSource().getBindingContext();

            var that = this;

            var oDialog = sap.ui.xmlfragment("zi2d.eam.malfunction.manages1.view.fragment.TimeConfirmationDialog", jQuery.extend({}, this, {
                afterDialogOpen: function() {
                    var oActualworkquantityField = sap.ui.getCore().byId("ActualworkquantityField");
                    if (oActualworkquantityField) {
                        oActualworkquantityField.setValue(null); //setValue('0');
                    }
                    var oPersonalnummerField = sap.ui.getCore().byId("PersonalnummerField");
                    if (oPersonalnummerField) {
                        oPersonalnummerField.getParent().setLabel(oi18n.getText("persnr"));
                    }

                    var oPostingdateField = sap.ui.getCore().byId("PostingdateField");
                    if (oPostingdateField) {
                        oPostingdateField.getParent().setLabel(oi18n.getText("postingdate"));
                        var Today = new Date();
                        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                            pattern: "dd.MM.yyyy"
                        });
                        oPostingdateField.setValue(dateFormat.format(Today));
                    }
                },
                afterDialogClosed: function() {
                    this.getView().removeDependent(oDialog);
                    oDialog.destroy(true);
                },
                cancelTimeConfirmation: function() {
                    oDialog.close();
                    if (oModel.hasPendingChanges()) {
                        oModel.resetChanges();
                    }
                },
                createTimeConfirmation: function() {
                    var oSourceData = oEvent.getSource().getBindingContext().getObject();
                    var oActualworkquantityField = sap.ui.getCore().byId("ActualworkquantityField");
                    var sActualworkquantity = oActualworkquantityField.getValue();
                    var sActualworkquantityunit = sap.ui.getCore().byId("ActualworkquantityField-sfEdit-comboBoxEdit").getSelectedKey();
                    sActualworkquantity = sActualworkquantity.replace(",", ".");
                    if (sActualworkquantity <= 0) {
                        oActualworkquantityField.setValueState(sap.ui.core.ValueState.Error);
                        return;
                    } else {
                        oActualworkquantityField.setValueState(sap.ui.core.ValueState.None);
                    }

                    var sIsfinalconfirmation = sap.ui.getCore().byId("IsfinalconfirmationField").getValue();
                    var sPersonnelnumber = sap.ui.getCore().byId("OperationPersonResponsible").getValue();
                    var sPostingdate = sap.ui.getCore().byId("PostingdateField").getValue();
                    var dPostingdate = new Date();
                    dPostingdate.setFullYear(sPostingdate.substr(6, 4), sPostingdate.substr(3, 2), sPostingdate.substr(0, 2));
                    dPostingdate.setMonth(dPostingdate.getMonth() - 1);

                    oDialog.close();

                    that._CallFunction("/CreateTimeConfirmation", "POST", {
                        "MaintenanceOrder": oSourceData.MaintenanceOrder,
                        "MaintenanceNotification": this._sMaintenanceNotification,
                        "MaintenanceOrderOperation": oSourceData.MaintenanceOrderOperation,
                        "Actualworkquantity": sActualworkquantity,
                        "Actualworkquantityunit": sActualworkquantityunit,
                        "Isfinalconfirmation": sIsfinalconfirmation,
                        "Personnelnumber": sPersonnelnumber,
                        "Postingdate": dPostingdate
                    }, "ZEAM_OBJPG_MAINTORDANDOPER_SRV");
                    // }
                }
            }));

            oDialog.setBindingContext(oContext);
            this.getView().addDependent(oDialog);

            oDialog.open();
        },

        onBeforeRebindTable: function(oEvent) {
            this._bindConfirmationColumnsVisibility();
        },

        _bindConfirmationColumnsVisibility: function() {
            var aColumns = this._oSmartTable.getTable().getColumns().filter(function(oColumn) {
                var sId = oColumn.getId();
                return ((sId.indexOf("ConfirmationTotalQuantity") !== -1) || (sId.indexOf("IsFinallyConfirmed") !== -1));
            });

            // aColumns.forEach(function(oColumn) {
            //     oColumn.bindProperty("visible", "app>/isInConfirmationMode");
            // });
        },

        _updateOrderAndNotificationNumber: function(sOrder, sNotification) {
            this._sMaintenanceNotification = sNotification;

            if (sOrder && this._sMaintenanceOrder !== sOrder) {
                var sOrderPath = this.getModel().createKey("/ZC_MaintOrderTP", {
                    MaintenanceOrder: sOrder
                });
                this._oSmartTable.setTableBindingPath(sOrderPath + "/to_MaintOrderOperationTP");
                this._oSmartTable.getTable().setNoDataText(this.getI18nBundle().getText("ymsg.noMatchingWorkItems"));
                this._oSmartTable.rebindTable();
            } else if (this._sMaintenanceOrder !== sOrder) {
                this._oSmartTable.setTableBindingPath(null);
                this._oSmartTable.getTable().setNoDataText(this.getI18nBundle().getText("ymsg.noWorkData"));
                this._oSmartTable.getTable().unbindItems();
                this._oSmartTable.updateTableHeaderState();
            }

            this._sMaintenanceOrder = sOrder;
        },

        onValueHelpOperationWorkCenter: function() {
            if (this._oValueHelpOperationWorkCenter) {
                this._oValueHelpOperationWorkCenter.destroy();
            }
            this._oValueHelpOperationWorkCenter = sap.ui.xmlfragment(
                "zi2d.eam.malfunction.manages1.view.fragment.ValueHelpOperationWorkCenter",
                this
            );
            this.getView().addDependent(this._oValueHelpOperationWorkCenter);

            this.getModel("appView").setProperty("/OperationWorkCenter", "");
            this._oValueHelpOperationWorkCenter.open();
        },

        onChooseOperationWorkCenter: function(oEvent) {
            if (oEvent.getSource().getSelectedIndex && oEvent.getSource().getSelectedIndex() > -1) {
                var aSelectedCells = oEvent.getSource().getRows()[oEvent.getSource().getSelectedIndex()].getCells();
                if (aSelectedCells) {
                    if (aSelectedCells[0]) {
                        this.getModel("appView").setProperty("/OperationWorkCenter", aSelectedCells[0].getTitle());
                    }
                    if (aSelectedCells[1]) {
                        this.getModel("appView").setProperty("/Plant", aSelectedCells[1].getText());
                    }

                }
            }

            this.onCancelValueHelpOperationWorkCenter(this);
        },

        onExitValueHelpOperationWorkCenter: function() {
            this._oValueHelpOperationWorkCenter.destroy();
        },

        onCancelValueHelpOperationWorkCenter: function() {
            if (this._oValueHelpOperationWorkCenter && this._oValueHelpOperationWorkCenter.isOpen()) {
                this._oValueHelpOperationWorkCenter.close();
            }
        }


    });

});
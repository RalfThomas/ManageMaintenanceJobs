sap.ui.define([
    "zi2d/eam/malfunction/manages1/controller/BaseController",
    "sap/ui/generic/app/ApplicationController",
    "sap/m/MessageBox",
    "zi2d/eam/malfunction/manages1/util/Notification",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    'sap/ui/comp/filterbar/FilterBar',
    'sap/ui/comp/filterbar/FilterGroupItem',
    'sap/ui/comp/filterbar/FilterItem',
    'sap/m/Token',
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], function(BaseController, ApplicationController, MessageBox, Notification, J, Fragment, FilterBar, FilterGroupItem, FilterItem, Token, Filter, FilterOperator) {
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
            var sIsfinalconfirmationInitial = null;


            var oDialog = sap.ui.xmlfragment("zi2d.eam.malfunction.manages1.view.fragment.TimeConfirmationDialog", jQuery.extend({}, this, {
                afterDialogOpen: function() {
                    sIsfinalconfirmationInitial = sap.ui.getCore().byId("IsfinalconfirmationField").getValue();
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
                    oModel.resetChanges();
                    this._oSmartTable.rebindTable();
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
                    if(sIsfinalconfirmationInitial){
                        MessageBox.error(that.getI18nBundle().getText("ymsg.finallyConfirmed"));                        
                        this.cancelTimeConfirmation();
                        return;
                    }
                                             
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

            const oInput = sap.ui.getCore().byId("inpOperationWorkCenter");

            Fragment.load({
                name: "zi2d.eam.malfunction.manages1.view.fragment.ValueHelpOperationWorkCenter",
                controller: this
            }).then(function name(oFragment) {
                const oColumns = new J({
                    "cols": [
                        {
                            "label": "{i18n>xtit.MainWorkCenter}",
                            "template": "Mainworkcenter"
                        },
                        {
                            "label": "{i18n>xtit.Plant}",
                            "template": "Plant"
                        },
                        {
                            "label": "{i18n>xtit.MainWorkCenterText}",
                            "template": "Mainworkcentertext"
                        }
                    ]
                });
                const aColumns = oColumns.getProperty("/cols");
                this._oValueHelpOperationWorkCenter = oFragment;
                this.getView().addDependent(this._oValueHelpOperationWorkCenter);
                var oModel = this.getModel("ZEAM_NTF_CREATE_SRV");

                //var oModel = this.getModel("appView").setProperty("ZEAM_NTF_CREATE/MainWorkCenterVHSet", "");

                this._oValueHelpOperationWorkCenter.getTableAsync().then(function (oTable) {
                    oTable.setModel(oModel);
                    oTable.setModel(oColumns, "columns");
                    
                    if (oTable.bindRows) {
                        oTable.bindAggregation("rows", "/MainWorkCenterVHSet");
                    }
                    if (oTable.bindItems) {
                        oTable.bindAggregation("items", "/MainWorkCenterVHSet", function () {
                            return new ColumnListItem({
                                cells: aColumns.map(function (column) {
                                    return new Label({ text: "{" + column.template + "}" });
                                })
                            });
                        });
                    }
                    this._oValueHelpOperationWorkCenter.update();
                }.bind(this));
                
                var oFilterBar = new FilterBar({
                    advancedMode: true,
                    search: this.onFilterBarSearch.bind(this)
                })
                var oFilterInput = new sap.m.Input({
                    id: "PlantFilterID3",
                    name: "Plant"
                })
                var oFilterGroupItem = new FilterGroupItem({
                    groupName: "__$INTERNAL$",
                    name: "Plant",
                    label: "{i18n>xtit.Plant}",
                    visibleInFilterBar: true,
                    control: [oFilterInput]
                })
                oFilterBar.addFilterGroupItem(oFilterGroupItem);
                oFragment.setFilterBar(oFilterBar);
                //if (this._sCurrentPlant) {
                    oFilterInput.setValue(sap.ui.getCore().byId("idPlantText").getText());  
                    oFilterBar.fireSearch({ selectionSet: [oFilterInput] });
                //}
                var oToken = new Token();
                oToken.setKey(oInput.getSelectedKey());
                oToken.setText(oInput.getValue());
                this._oValueHelpOperationWorkCenter.setTokens([oToken]);
                this._oValueHelpOperationWorkCenter.open();
            }.bind(this));


/*
            this._oValueHelpOperationWorkCenter = sap.ui.xmlfragment(
                "zi2d.eam.malfunction.manages1.view.fragment.ValueHelpOperationWorkCenter",
                this
            );

            this.getView().addDependent(this._oValueHelpOperationWorkCenter);

            this.getModel("appView").setProperty("/OperationWorkCenter", "");
            this._oValueHelpOperationWorkCenter.open();

            */

        },

        onValueHelpCancelPress: function () {
            this._oValueHelpOperationWorkCenter.close();
        },
        onValueHelpAfterClose: function () {
            this._oValueHelpOperationWorkCenter.destroy();
        },
        onValueHelpOkPress: function (oEvent) {
            var aTokens = oEvent.getParameter("tokens");
            sap.ui.getCore().byId("inpOperationWorkCenter").setSelectedKey(aTokens[0].getKey());
            var oTable = oEvent.getSource().getTable();
            if (oTable) {
                var mainworkcenter = oEvent.getParameters().tokens[0].getAggregation("customData")[0].getProperty("value").Mainworkcenter;
                var plant = oEvent.getParameters().tokens[0].getAggregation("customData")[0].getProperty("value").Plant;
                //var selectedIndex = oTable.getSelectedIndex();
                //var mainworkcenter = oTable.getRows()[selectedIndex].getBindingContext().getObject().Mainworkcenter;
                sap.ui.getCore().byId("inpOperationWorkCenter").setValue(mainworkcenter);
                sap.ui.getCore().byId("idPlantText").setText(plant);
            }
            this._oValueHelpOperationWorkCenter.close();
        },
        onFilterBarSearch: function (oEvent) {
            //var sSearchQuery = this._oBasicSearchField.getValue(),
            var aSelectionSet = oEvent.getParameter("selectionSet");
            var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
                if (oControl.getValue()) {
                    aResult.push(new Filter({
                        path: oControl.getName(),
                        operator: FilterOperator.Contains,
                        value1: oControl.getValue()
                    }));
                }
                return aResult;
            }, []);
            // aFilters.push(new Filter({
            //  filters: [
            //      new Filter({ path: "Mainworkcenter", operator: FilterOperator.Contains, value1: sSearchQuery }),
            //      new Filter({ path: "Plant", operator: FilterOperator.Contains, value1: sSearchQuery }),
            //      new Filter({ path: "Mainworkcentertext", operator: FilterOperator.Contains, value1: sSearchQuery })
            //  ],
            //  and: false
            // }));
            this._filterTable(new Filter({
                filters: aFilters,
                and: true
            }));
        },
        _filterTable: function (oFilter) {
            var oValueHelpDialog = this._oValueHelpOperationWorkCenter;
            oValueHelpDialog.getTableAsync().then(function (oTable) {
                if (oTable.bindRows) {
                    oTable.getBinding("rows").filter(oFilter);
                }
                if (oTable.bindItems) {
                    oTable.getBinding("items").filter(oFilter);
                }
                oValueHelpDialog.update();
            });
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
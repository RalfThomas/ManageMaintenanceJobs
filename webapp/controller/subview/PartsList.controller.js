sap.ui.define([
    "zi2d/eam/malfunction/manages1/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "zi2d/eam/malfunction/manages1/util/Constants",
    "sap/ui/generic/app/ApplicationController",
    "zi2d/eam/malfunction/manages1/util/Notification",
    "sap/m/MessageBox",
    "../../model/formatter",
    "zi2d/eam/malfunction/manages1/util/Order",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function(BaseController, JSONModel, Constants, ApplicationController, Notification, MessageBox, formatter, Order,
    MessageToast, Filter, FilterOperator) {
    "use strict";
    return BaseController.extend("zi2d.eam.malfunction.manages1.controller.subview.PartsList", {
        _oP13NModel: null,
        _sMaintenanceNotification: null,
        _sMaintenanceOrder: null,
        _oNotificationUtil: null,
        formatter: formatter,

        onInit: function() {

            this._oP13NModel = new JSONModel({
                partsView: "thumbnail"
            });
            this.getView().setModel(this._oP13NModel, "p13n");
            this.getView().attachModelContextChange(this.onModelContextChange, this);

            this.getRouter().getRoute("displayJob").attachPatternMatched(this.onDisplayJobRouteMatched, this);

            this._oSmartTable = this.byId("malfuncManagePartsTable");
            this._oNotificationUtil = new Notification();

        },

        onModelContextChange: function() {
            var that = this;
            this.getOwnerComponent().getModel().metadataLoaded()
                .then(this.getNotification.bind(this))
                .then(function(oJobKeysContext) {
                    var oJobKeys = that._oNotificationUtil.extractOrderandNotification(oJobKeysContext);

                    var sOrder = oJobKeys.MaintenanceOrder;
                    that._sMaintenanceNotification = oJobKeys.MaintenanceNotification;

                    if (sOrder && that._sMaintenanceOrder !== sOrder) {
                        that._sMaintenanceOrder = sOrder;
                        that._oSmartTable.setTableBindingPath("/ZC_MaintOrderComponentTP");
                        that._oSmartTable.rebindTable();
                    } else if (that._sMaintenanceOrder !== sOrder) {
                        that._sMaintenanceOrder = sOrder;
                        that._oSmartTable.setTableBindingPath(null);
                        that._oSmartTable.getTable().setNoDataText(that.getI18nBundle().getText("ymsg.noPartsData"));
                        that._oSmartTable.getTable().unbindItems();
                        that._oSmartTable.updateTableHeaderState();
                    }
                });
        },

        onDisplayJobRouteMatched: function(oEvent) {
            // due to the association binding, UI5 doesn't understand when the item(s) change
            if (this._sMaintenanceOrder && this._sMaintenanceNotification && oEvent.getParameter("arguments").MaintenanceNotification === this._sMaintenanceNotification) {
                this._oSmartTable.rebindTable();
            }
        },

        onAddMaterial: function(oEvent) {
            var that = this;
            var that = this,
                oModel = this.getModel();

            this.getView().getModel("FunctionImportModel").setProperty("/FunctionImport", "CreateOrderComponent");
            this.getView().getModel("appView").setProperty("/Plant", oEvent.getSource().getBindingContext().getObject().MaintenanceWorkCenterPlant);

            var oModel = this.getView().getModel();

            var oDialog = sap.ui.xmlfragment("zi2d.eam.malfunction.manages1.view.fragment.CreateOrderComponent", jQuery.extend({}, this, {
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
                onCreateOrderComponent: function() {

                    var sPlant = this.getView().getModel("appView").getProperty("/Plant");
                    var sMaterial = this.getView().getModel("appView").getProperty("/Material");
                    var sOperation = this.getView().getModel("appView").getProperty("/MaintenanceOrderOperation");
                    var sBaseunit = this.getView().getModel("appView").getProperty("/Requirementquantityinbaseunit");
                    if (!sBaseunit) {
                        sBaseunit = 0;
                    }
                    var sStorageLocation = this.getView().getModel("appView").getProperty("/StorageLocation");
                    if (!sStorageLocation) {
                        sStorageLocation = "";
                    }
                    if (!sPlant || sPlant === "" || !sMaterial || sMaterial === "" || !sOperation || sOperation === "") {
                        MessageBox.error(that.getI18nBundle().getText("ymsg.mandantory"));
                        return;
                    } else {

                        oDialog.close();

                        this._CallFunction("/CreateOrderComponent", "POST", {
                            "MaintenanceOrder": oEvent.getSource().getBindingContext().getObject().MaintenanceOrder,
                            "MaintenanceOrderOperation": sOperation,
                            "Material": sMaterial,
                            "Requirementquantityinbaseunit": sBaseunit,
                            "StorageLocation": sStorageLocation,
                            "Plant": sPlant
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

        onEditPartPressed: function(oEvent) {
            var oSourceData = oEvent.getSource().getBindingContext().getObject();
            this.getView().getModel("FunctionImportModel").setProperty("/FunctionImport", "ChangeOrderComponent");

            this.getRouter().navTo("editPart", {
                "MaintenanceNotification": this._sMaintenanceNotification,
                "MaintenanceOrder": oSourceData.MaintenanceOrder,
                "MaintenanceOrderOperation": oSourceData.MaintenanceOrderOperation,
                "MaintenanceOrderComponent": oSourceData.MaintenanceOrderComponent
            });
        },

        onDeletePartPressed: function(oEvent) {
            var that = this;

            var oMaintNotifPartBindingContext = oEvent.getSource().getBindingContext();
            if (!oMaintNotifPartBindingContext) {
                return;
            }

            // User has to confirm deletion before Part Entity is deleted
            that.showDeletionConfirmationDialog(oMaintNotifPartBindingContext.getObject().Material, that.getI18nBundle().getText(
                "ymsg.deletePart")).then(function() {
                var oObject = oMaintNotifPartBindingContext.getObject();
                that._CallFunction("/DeleteOrderComponent", "POST", {
                    "MaintenanceOrder": oObject.MaintenanceOrder,
                    "MaintenanceOrderComponent": oObject.MaintenanceOrderComponent,
                    "MaintenanceOrderOperation": oObject.MaintenanceOrderOperation
                });
            });
        },

        onBeforeRebindTable: function(oEvent) {
            var mBindingParams = oEvent.getParameter("bindingParams");

            this._bindConfirmationColumnsVisibility();

            if (this._sMaintenanceOrder) {
                mBindingParams.filters.push(new sap.ui.model.Filter("MaintenanceOrder", sap.ui.model.FilterOperator.EQ, this._sMaintenanceOrder));
            } else {
                mBindingParams.preventTableBind = true;
            }
        },

        _bindConfirmationColumnsVisibility: function() {
            var aColumns = this._oSmartTable.getTable().getColumns().filter(function(oColumn) {
                return oColumn.getId().indexOf("QuantityWithdrawnInBaseUnit") !== -1;
            });

            if (aColumns.length === 1) {
                aColumns[0].bindProperty("visible", "app>/isInConfirmationMode");
            }
        },

        onScanSuccess: function(oEvent) {
            var sMaterial = oEvent.getParameter("text");
            if (!sMaterial) {
                return;
            }

            this._oSmartTable.setBusy(true);
            var that = this;
            this.getMyOperation().then(function(oOperation) {
                return new Order().createOrderOperationComponent(that.getModel(), {
                    MaintenanceOrder: oOperation.MaintenanceOrder,
                    MaintenanceOrderOperation: oOperation.MaintenanceOrderOperation,
                    Material: sMaterial
                });
            }).then(function() {
                that._oSmartTable.setBusy(false);
                MessageToast.show(that.getI18nBundle().getText("xmsg.materialAddedToReport", [sMaterial]));
                that._oSmartTable.rebindTable();
            }).catch(function() {
                that._oSmartTable.setBusy(false);
                that.onError.apply(that, arguments);
            });
        },

        onScanFail: function(oEvent) {},

        getMyOperation: function() {
            var that = this,
                oMaintenanceNotification;

            return this.prepareTransaction()
                .then(function() {
                    return that.parentBindingContextAvailable("C_MaintNotificationTP");

                }).then(function(oBindingContext) {
                    oMaintenanceNotification = oBindingContext;

                    if (!oMaintenanceNotification.getProperty("MaintenanceOrder")) {
                        return Promise.resolve([]);
                    } else {
                        return that.dataAvailable("ZC_MaintOrderOperationTP");
                    }
                }).then(function(aOperations) {
                    var sMaintenanceOrder = oMaintenanceNotification.getProperty("MaintenanceOrder"),
                        aOperationsOfUser = aOperations.filter(function(oEntity) {
                            return (oEntity.UserIsPersonResponsible && oEntity.MaintenanceOrder === sMaintenanceOrder);
                        });

                    if (aOperations.length === 0) {
                        return Promise.reject(that.getI18nBundle().getText("ymsg.noWorkItemAssignedToYou"));
                    } else if (aOperationsOfUser.length === 0) {
                        return Promise.reject(that.getI18nBundle().getText("ymsg.noWorkItemAssignedToYou"));
                    } else {
                        return Promise.resolve(aOperationsOfUser[0]);
                    }
                });
        },

        onValueHelpPlant: function() {
            if (this._oValueHelpPlant) {
                this._oValueHelpPlant.destroy();
            }
            this._oValueHelpPlant = sap.ui.xmlfragment(
                "zi2d.eam.malfunction.manages1.view.fragment.ValueHelpPlant",
                this
            );
            this.getView().addDependent(this._oValueHelpPlant);

            this._oValueHelpPlant.open();
        },

        onChoosePlant: function(oEvent) {
            if (oEvent.getSource().getSelectedIndex && oEvent.getSource().getSelectedIndex() > -1) {
                var aSelectedCells = oEvent.getSource().getRows()[oEvent.getSource().getSelectedIndex()].getCells();
                if (aSelectedCells) {
                    if (aSelectedCells[0]) {
                        this.getModel("appView").setProperty("/Plant", aSelectedCells[0].getText());
                    }
                }
            }

            this.onCancelValueHelpPlant(this);
        },

        onExitValueHelpPlant: function() {
            this._oValueHelpPlant.destroy();
        },

        onCancelValueHelpPlant: function() {
            if (this._oValueHelpPlant && this._oValueHelpPlant.isOpen()) {
                this._oValueHelpPlant.close();
            }
        },

        onValueHelpBaseUnit: function() {
            if (this._oValueHelpBaseUnit) {
                this._oValueHelpBaseUnit.destroy();
            }

            this._oValueHelpBaseUnit = sap.ui.xmlfragment(
                "zi2d.eam.malfunction.manages1.view.fragment.ValueHelpBaseUnit",
                this
            );
            this.getView().addDependent(this._oValueHelpBaseUnit);

            this._oValueHelpBaseUnit.open();
        },

        onChooseBaseUnit: function(oEvent) {
            if (oEvent.getSource().getSelectedIndex && oEvent.getSource().getSelectedIndex() > -1) {
                var aSelectedCells = oEvent.getSource().getRows()[oEvent.getSource().getSelectedIndex()].getCells();
                if (aSelectedCells) {
                    if (aSelectedCells[0]) {
                        this.getModel("appView").setProperty("/BaseUnit", aSelectedCells[0].getText());
                    }
                }
            }

            this.onCancelValueHelpBaseUnit(this);
        },

        onExitValueHelpBaseUnit: function() {
            this._oValueHelpBaseUnit.destroy();
        },

        onCancelValueHelpBaseUnit: function() {
            if (this._oValueHelpBaseUnit && this._oValueHelpBaseUnit.isOpen()) {
                this._oValueHelpBaseUnit.close();
            }
        },

        onValueHelpStorageLocation: function() {

            if (this._oValueHelpStorageLocation) {
                this._oValueHelpStorageLocation.destroy();
            }

            this._oValueHelpStorageLocation = sap.ui.xmlfragment(
                "zi2d.eam.malfunction.manages1.view.fragment.ValueHelpStorageLocation",
                this
            );
            this.getView().addDependent(this._oValueHelpStorageLocation);

            this._oValueHelpStorageLocation.open();
        },

        onChooseStorageLocation: function(oEvent) {
            if (oEvent.getSource().getSelectedIndex && oEvent.getSource().getSelectedIndex() > -1) {
                var aSelectedCells = oEvent.getSource().getRows()[oEvent.getSource().getSelectedIndex()].getCells();
                if (aSelectedCells) {
                    if (aSelectedCells[0]) {
                        this.getModel("appView").setProperty("/StorageLocation", aSelectedCells[0].getText());
                    }
                }
            }

            this.onCancelValueHelpStorageLocation(this);
        },

        onExitValueHelpStorageLocation: function() {
            this._oValueHelpStorageLocation.destroy();
        },

        onCancelValueHelpStorageLocation: function() {
            if (this._oValueHelpStorageLocation && this._oValueHelpStorageLocation.isOpen()) {
                this._oValueHelpStorageLocation.close();
            }
        },

        onSuggestMaintenanceOrderOperation: function(oEvent) {
            var sTerm = oEvent.getParameter("suggestValue");
            var aFilters = [];
            if (sTerm) {
                aFilters.push(new Filter("MaintenanceOrderOperation", FilterOperator.Contains, sTerm));
            }

            oEvent.getSource().getBinding("suggestionItems").filter(aFilters);
        },

        onChangeMaintenanceOrderOperation: function(oEvent) {
            var sValue = oEvent.getSource().getValue();
            var aWorkItems = this.getModel("appView").getProperty("/WorkItems");
            aWorkItems = aWorkItems.filter(function(oWorkItem) {
                return oWorkItem.MaintenanceOrderOperation === sValue;
            });

            if (aWorkItems.length <= 0) {
                MessageBox.error(this.getI18nBundle().getText("ymsg.noValidWorkItem"));
            }
        },

        onValueHelpMaterial: function() {
            if (this._oValueHelpMaterial) {
                this._oValueHelpMaterial.destroy();
            }
            this._oValueHelpMaterial = sap.ui.xmlfragment(
                "zi2d.eam.malfunction.manages1.view.fragment.ValueHelpMaterial",
                this
            );
            this.getView().addDependent(this._oValueHelpMaterial);

            this.getModel("appView").setProperty("/Material", "");
            this._oValueHelpMaterial.open();
        },

        onChooseMaterial: function(oEvent) {
            if (oEvent.getSource().getSelectedIndex && oEvent.getSource().getSelectedIndex() > -1) {
                var aSelectedCells = oEvent.getSource().getRows()[oEvent.getSource().getSelectedIndex()].getCells();
                if (aSelectedCells) {
                    if (aSelectedCells[0]) {
                        this.getModel("appView").setProperty("/Material", aSelectedCells[0].getText());
                    }
                }
            }

            this.onCancelValueHelpMaterial(this);
        },

        onExitValueHelpMaterial: function() {
            this._oValueHelpMaterial.destroy();
        },

        onCancelValueHelpMaterial: function() {
            if (this._oValueHelpMaterial && this._oValueHelpMaterial.isOpen()) {
                this._oValueHelpMaterial.close();
            }
        }

    });

});
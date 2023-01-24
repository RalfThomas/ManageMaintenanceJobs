sap.ui.define([
    "./../DialogController",
    "sap/ui/base/ManagedObjectObserver",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    'sap/ui/comp/filterbar/FilterBar',
    'sap/ui/comp/filterbar/FilterGroupItem',
    'sap/ui/comp/filterbar/FilterItem',
    'sap/m/Token',
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], function(DialogController, ManagedObjectObserver, J, Fragment, FilterBar, FilterGroupItem, FilterItem, Token, Filter, FilterOperator) {
    "use strict";

    return DialogController.extend("zi2d.eam.malfunction.manages1.controller.fragment.EditWorkItemDialog", {

        SLIDER_MAX_TIME_IN_SECONDS: 36000,
        _oPlannedWorkSlider: null,
        _oPlannedWorkField: null,
        _oPlannedEffortUomField: null,
        _oDurationUomField: null,
        _oUomObserver: null,

        onInit: function() {

            var oRouter = this.getRouter();
            if (oRouter) {
                oRouter.getRoute("addWorkItem").attachMatched(this.onAddWorkItemRouteMatched, this);
                oRouter.getRoute("editWorkItem").attachMatched(this.onEditWorkItemRouteMatched, this);
            }

            this._oUomObserver = new ManagedObjectObserver(this._onUomFieldItemsBindingChanged.bind(this));

            this.getView().loaded().then(function() {
                this._oPlannedWorkSlider = this.byId("malfuncManageOperationPlannedWorkSlider");
                this._oPlannedWorkField = this.byId("malfuncManageOperationPlannedWorkSmartField");

                this._oPlannedWorkField.attachInnerControlsCreated(function(oEvent) {
                    var that = this;
                    oEvent.getSource().getInnerControls().some(function(oControl) {
                        if (oControl.isA("sap.m.ComboBoxBase")) {
                            that._oPlannedEffortUomField = oControl;
                            that._applyTimeUnitVH(oControl);
                            return true;
                        }
                        return false;
                    });
                }, this);
            }.bind(this));
        },

        onEditWorkItemRouteMatched: function(oEvent) {
            var mArguments = oEvent.getParameter("arguments");

            this.prepareDialog(mArguments, false);
        },

        onAddWorkItemRouteMatched: function(oEvent) {
            var mArguments = oEvent.getParameter("arguments");

            this.prepareDialog(mArguments, true);
        },

        onBeforeSideEffectExecution: function(oEvent) {
            if (oEvent.getParameter("valueChange") !== true) {
                return;
            }

            oEvent.getParameter("promise").then(function() {
                var oContext = this.oView.getBindingContext(),
                    sDefaultUnit;

                if (!oContext.getProperty("OperationPlannedWorkUnit")) {
                    sDefaultUnit = this.oView.getBindingContext().getProperty("to_MaintOrderTP/to_PlanningPlantDefaults/OperationPlannedWorkUnit");

                    this._oPlannedWorkField.setUnitOfMeasure(sDefaultUnit);
                    this._adjustSlider(this._oPlannedWorkSlider, oContext.getProperty("OperationPlannedWork"), sDefaultUnit);
                }

            }.bind(this));
        },

        onPlanningValueVisibilityChanged: function(oEvent) {
            if (!oEvent.getParameter("visible")) {
                return;
            }

            // find out which field is now visible (=which slider needs to be adjusted)
            var oSource = oEvent.getSource(),
                oBindingContext = oSource.getBindingContext();
            if (oSource.getFields().some(function(oField) {
                    return (oField.isA("sap.ui.comp.smartfield.SmartField") && oField.getFieldGroupIds().indexOf("OperationPlannedWork") !== -1);
                })) {
                // OperationPlannedWork
                this._adjustSlider(this._oPlannedWorkSlider, oBindingContext.getProperty("OperationPlannedWork"),
                    oBindingContext.getProperty("OperationPlannedWorkUnit"));
                this._applyTimeUnitVH(this._oPlannedEffortUomField);
            } else {
                // OperationDuration
                // this._adjustSlider(this._oDurationSlider, oBindingContext.getProperty("OperationDuration"),
                //     oBindingContext.getProperty("OperationDurationUnit"));
                // this._applyTimeUnitVH(this._oDurationUomField);
            }
        },

        _applyTimeUnitVH: function(oUomField) {
            if (!oUomField) {
                return;
            }

            this._oUomObserver.observe(oUomField, {
                aggregations: ["items"]
            });
        },

        prepareDialog: function(mArguments, bIsCreate) {
            var that = this;
            that.getModel("app").setProperty("/isDialogBusy", true);

            this.prepareTransaction()
                .then(this._parentContextAvailable.bind(this))
                .then(function() {
                    var oParentContext = that.getView().getParent().getBindingContext();

                    var sKey = that.getModel().createKey("/ZC_MaintOrderOperationTP", {
                        MaintenanceOrder: bIsCreate ? oParentContext.getProperty("MaintenanceOrder") : mArguments.MaintenanceOrder,
                        MaintenanceOrderOperation: bIsCreate ? "" : mArguments.MaintenanceOrderOperation
                    });

                    return new Promise(function(resolve, reject) {
                        that.getModel().createBindingContext(sKey, resolve);
                    });
                }).then(function(oBindingContext) {
                    if (oBindingContext) {
                        return that.initializeDraftDialog("pmMalfuncManageDialogEditWorkItem", oBindingContext, "malfuncManageSmartFormEditWorkItem");
                    } else {
                        return that.initializeDraftDialog("pmMalfuncManageDialogEditWorkItem", that.getView().getBindingContext(), "malfuncManageSmartFormEditWorkItem");
                        that.getView().getBindingContext()
                    }

                }).then(function() {
                    // we now have the dialog open, so we will use isDialogBusy
                    //wird in onEditWorkItemPressed in WorkItemList.controller auf false gesetzt
                    that.getModel("app").setProperty("/isBusy", false);
                    that.getModel("app").setProperty("/isDialogBusy", true);

                    that._oApplicationController.attachEvent("beforeSideEffectExecution", that.onBeforeSideEffectExecution, that);
                }).catch(jQuery.proxy(this.onError, this, true));

            // Set dialog title
            var oDialog = this.getView().byId("pmMalfuncManageDialogEditWorkItem");

            oDialog.bindProperty("busy", "app>/isDialogBusy");
            oDialog.setTitle(this.getI18nBundle().getText(bIsCreate ? "xtit.addWorkItem" : "xtit.editWorkItem"));
        },

        onPlanningValueChanged: function(oEvent) {
            var bUnitChanged = oEvent.getParameter("unitChanged"),
                sNewValue = oEvent.getParameter("newValue"),
                oField = oEvent.getSource(),
                // oSlider = oField.getFieldGroupIds().indexOf("OperationPlannedWork") !== -1 ? this._oPlannedWorkSlider : this._oDurationSlider;
                oSlider = this._oPlannedWorkSlider;

            if (bUnitChanged === true) {
                if (sNewValue === undefined) {
                    return;
                }
                this._adjustSlider(oSlider, oField.getBindingContext().getProperty(oField.getBindingPath("value")), sNewValue);
            } else {
                oSlider.setValue(parseFloat(sNewValue));
            }
        },

        onPlanningValueSliderChange: function(oEvent) {
            var iValue = oEvent.getParameter("value"),
                oField = oEvent.getSource().getParent().getFields()[1];

            // this way we bring the value into the draft model (will trigger a MERGE):
            oField.setValue(iValue.toString());
        },

        onMainWorkCenterValueHelpRequest: function () {

            const oInput = this.getView().byId("idMainWorkCenterInput");

           
            Fragment.load({
                name: "zi2d.eam.malfunction.manages1.view.fragment.MainWorkCenterInput",
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

                this._pValueHelpDialog = oFragment;
                this.getView().addDependent(this._pValueHelpDialog);

                var oModel = this.getModel("ZEAM_NTF_CREATE_SRV");

                this._pValueHelpDialog.getTableAsync().then(function (oTable) {

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
                    this._pValueHelpDialog.update();

                }.bind(this));
                

                var oFilterBar = new FilterBar({
                    advancedMode: true,
                    search: this.onFilterBarSearch.bind(this)
                })

                var oFilterInput = new sap.m.Input({
                    id: "PlantFilterID2",
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
                
                    oFilterInput.setValue(this.getView().byId("idPlantInput").getValue());
                    oFilterBar.fireSearch({ selectionSet: [oFilterInput] });
                //}

                var oToken = new Token();

                oToken.setKey(oInput.getSelectedKey());

                oToken.setText(oInput.getValue());

                this._pValueHelpDialog.setTokens([oToken]);

                this._pValueHelpDialog.open();

            }.bind(this));


        },

        onValueHelpCancelPress: function () {
            this._pValueHelpDialog.close();
        },

        onValueHelpAfterClose: function () {
            this._pValueHelpDialog.destroy();
        },

        onValueHelpOkPress: function (oEvent) {
            var aTokens = oEvent.getParameter("tokens");
            this.getView().byId("idMainWorkCenterInput").setSelectedKey(aTokens[0].getKey());
            var oTable = oEvent.getSource().getTable();
            if (oTable) {
                var mainworkcenter = oEvent.getParameters().tokens[0].getAggregation("customData")[0].getProperty("value").Mainworkcenter;
                var plant = oEvent.getParameters().tokens[0].getAggregation("customData")[0].getProperty("value").Plant;
                //var selectedIndex = oTable.getSelectedIndex();
                //var mainworkcenter = oTable.getRows()[selectedIndex].getBindingContext().getObject().Mainworkcenter;
                this.getView().byId("idMainWorkCenterInput").setValue(mainworkcenter);
                this.getView().byId("idPlantInput").setValue(plant);
            }
            this._pValueHelpDialog.close();
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
            // 	filters: [
            // 		new Filter({ path: "Mainworkcenter", operator: FilterOperator.Contains, value1: sSearchQuery }),
            // 		new Filter({ path: "Plant", operator: FilterOperator.Contains, value1: sSearchQuery }),
            // 		new Filter({ path: "Mainworkcentertext", operator: FilterOperator.Contains, value1: sSearchQuery })
            // 	],
            // 	and: false
            // }));

            this._filterTable(new Filter({
                filters: aFilters,
                and: true
            }));
        },

        _filterTable: function (oFilter) {
            var oValueHelpDialog = this._pValueHelpDialog;

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

        _onOkPressed: function() {
            var that = this;
            //@todo make this an official overload
            DialogController.prototype._onOkPressed.apply(this, arguments);
            // .then(function(oResponse) {
            //     // fill order ID in notification header if not there yet already.
            //     var oParentContext = that.getView().getParent().getBindingContext();
            //     if (oResponse && !oParentContext.getProperty("MaintenanceOrder")) {
            //         that.getModel().setProperty(oParentContext.getPath() + "/MaintenanceOrder", oResponse.data.MaintenanceOrder);
            //     }
            // });
        },

        _adjustSlider: function(oSlider, iValue, sUnit) {
            var that = this;

            new Promise(function(resolve, reject) {
                if (!sUnit) {
                    resolve();
                    return;
                }

                var sKey = that.getModel().createKey("/I_PMTimeUnitVH", {
                        UnitOfMeasure: sUnit
                    }),
                    oTimeUnit = that.getModel().getProperty(sKey);

                if (!oTimeUnit) {
                    that.dataAvailable("I_PMTimeUnitVH", {
                        UnitOfMeasure: sUnit
                    }).then(function(oTimeUnitDelayed) {
                        resolve(oTimeUnitDelayed);
                    });
                } else {
                    resolve(oTimeUnit);
                }
            }).then(function(oTimeUnit) {
                if (!oTimeUnit) {
                    oSlider.setEnabled(false);
                    oSlider.setValue(0);
                    return;
                }

                var iNewUnitConversion = oTimeUnit.TimeUnitDurationInSeconds;

                if (!iNewUnitConversion) {
                    oSlider.setEnabled(false);
                    return;
                }

                var iNewMax = that.SLIDER_MAX_TIME_IN_SECONDS / iNewUnitConversion;

                var iNewStep = iNewMax / 10;
                if (iNewMax < 0.1 || (oTimeUnit.UnitOfMeasureNumberOfDecimals <= 0 && iNewStep % 1 > 0)) {
                    oSlider.setEnabled(false);
                    oSlider.setStep(iNewStep);
                } else {
                    oSlider.setEnabled(true);
                    oSlider.setStep(+iNewStep.toFixed(oTimeUnit.UnitOfMeasureNumberOfDecimals));
                }
                oSlider.setMax(iNewMax);
            }).then(function() {
                if (iValue !== null && oSlider.getEnabled() === true) {
                    oSlider.setValue(parseFloat(iValue));
                }
            }).catch(function() {});
        },

        _parentContextAvailable: function() {
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

        _onUomFieldItemsBindingChanged: function(mChange) {
            var oField = mChange.object,
                mBindingInfo = oField.getBindingInfo("items");

            if (!mBindingInfo) {
                return;
            }

            if (!mBindingInfo.filters.length) {
                oField.getBinding("items").filter(new sap.ui.model.Filter("TimeUnitDurationInSeconds", sap.ui.model.FilterOperator.BT, 1, 604800));
            }

            this._oUomObserver.unobserve(oField);
        }

    });

});
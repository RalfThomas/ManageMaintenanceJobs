sap.ui.define([
    "./BaseController",
    "zi2d/eam/malfunction/manages1/controller/subview/TechnicalObjectOverviewAttachments",
    "../model/formatter",
    "zi2d/eam/malfunction/manages1/util/Constants",
    "zi2d/eam/malfunction/manages1/util/Notification",
    "zi2d/eam/malfunction/manages1/util/Order",
    "sap/ui/model/json/JSONModel"
], function(BaseController, TechnicalObjectOverviewAttachments, formatter, Constants, NotificationUtil, OrderUtil, JSONModel) {

    "use strict";

    return BaseController.extend("zi2d.eam.malfunction.manages1.controller.JobObjectPage", {

        bIsInForeground: false,
        sEntityPath: "",
        _oOrderUtil: null,
        _oNotifUtil: null,

        formatter: formatter,

        onInit: function() {
            var oRoute = this.getRouter().getRoute("displayJob");
            this._oNotifUtil = new NotificationUtil();
            this._oOrderUtil = new OrderUtil();

            oRoute.attachPatternMatched(true, this.onRouteMatched, this);
            oRoute.attachMatched(false, this.onRouteMatched, this);

            var oModel = new JSONModel();
            this.getView().setModel(oModel, "KommentarModel");
            this._oKommentarModel = this.getView().getModel("KommentarModel");

            this._oTechnicalObjectOverviewAttachments = new TechnicalObjectOverviewAttachments();
        },

        onRouteMatched: function(oEvent, bIsInForeground) {
            var that = this,
                oView = that.getView(),
                fnOnDataReceived = function(oEvent) {
                    var oData = oEvent.getParameter("data");

                    if (!oData) {
                        return;
                    }

                    if (this.bIsInForeground) {
                        this.getModel("app").setProperty("/isBusy", false);
                    }

                    //this.determineEditState(oData);

                    //Work Items
                    this.getModel("appView").setProperty("/WorkItems", []);
                    var sOrder = oView.getBindingContext().getObject().MaintenanceOrder;
                    this.getView().getModel().read("/ZC_MaintOrderTP('" + sOrder + "')/to_MaintOrderOperationTP", {
                        success: function(oData) {
                            if (oData) {
                                that.getModel("appView").setProperty("/WorkItems", oData.results);
                            }
                        },
                        error: function(oResponse) {}
                    });

                    //Für Header Daten lesen
                    this.getView().getModel().read("/ZC_MalfunctionReportWorkItem(MaintenanceOrder='" + sOrder + "',MaintenanceOrderOperation='" + MaintenanceOrderOperation + "')", {
                        success: function(oData) {
                            that.getModel("appView").setProperty("/MalfunctionReportWorkItem", oData);
                        },
                        error: function(oResponse) {}
                    });

                    //Order Attachments
                    this.readOrderAttachments(sOrder);

                    //Daten zum technischen Objekt lesen
                    this.getModel("appView").setProperty("/TechnicalObject", null);
                    this.getModel("appView").setProperty("/VisTechnicalObject", false);
                    var TechnicalObjectNumber = that.getModel("appView").getProperty("/TechnicalObjectNumber");
                    if (TechnicalObjectNumber) {
                        if (TechnicalObjectNumber.TechnicalObjectNumber) {
                            TechnicalObjectNumber = TechnicalObjectNumber.TechnicalObjectNumber;
                        }
                        var TechnicalObjectType = that.getModel("appView").getProperty("/TechObjIsEquipOrFuncnlLoc");
                        var sPath = "/TechnicalObjectSet(TechnicalObjectNumber='" + TechnicalObjectNumber + "',TechnicalObjectType='" + TechnicalObjectType + "')";
                        this.getView().getModel("ZEAM_NTF_CREATE_SRV").read(sPath, {
                            success: function(oData) {
                                that.getModel("appView").setProperty("/TechnicalObject", oData);
                                that.getModel("appView").setProperty("/VisTechnicalObject", true);
                                that._oTechnicalObjectOverviewAttachments.onTechObGetAllOriginals(oData.TechnicalObjectNumber, oData.TechnicalObjectType, that.getModel("appView"));
                            },
                            error: function(oResponse) {}
                        });
                    }
                }.bind(this),
                sActiveMaintNotif = oEvent.getParameter("arguments").MaintenanceNotification;

            //Long Text
            this.readNotifLongText(sActiveMaintNotif);

            var MaintenanceOrderOperation = oEvent.getParameter("arguments").MaintenanceOrderOperation;

            this.bIsInForeground = bIsInForeground;

            if (bIsInForeground) {
                // When we get here, we've already run through bIsInForeground = false
                // waits for metadataLoaded to ensure "fairness in the race"
                this.getModel().metadataLoaded()
                    .then(function() {
                        // Ensure that we're actually waiting for data:
                        if (oView.getBindingContext() === undefined) {
                            that.getModel("app").setProperty("/isBusy", true);
                        }
                        that._loadNextActions("QM" + jQuery.sap.padLeft(sActiveMaintNotif, "0", 12));
                    });

                this.getModel().setRefreshAfterChange(true);
            } else {
                this.getModel().metadataLoaded()
                    .then(function() {
                        var oBindingContext = oView.getBindingContext(),
                            oAppContainer = that.getAppContainer(),
                            oAppBindingContext = oAppContainer && oAppContainer.getObjectBinding();

                        that.sEntityPath = that.getModel().createKey("/ZC_MaintNotificationTP", {
                            MaintenanceNotification: sActiveMaintNotif
                        });

                        if (oBindingContext && oBindingContext.getProperty("MaintenanceNotification") !== sActiveMaintNotif) {
                            // view is still bound to a different notification (case: back to list, pick another)
                            oView.unbindElement();
                        } else if (oBindingContext && oBindingContext.getPath() === that.sEntityPath) {
                            if (oBindingContext.getProperty("MaintenanceOrder") && !that.getModel("app").getProperty("/hasOrderAssigned")) {
                                // Discovered a newly created Maintenance Order
                                //that.determineEditState();
                            }
                            return;
                        }

                        if (oAppBindingContext && oAppBindingContext.getPath() === that.sEntityPath) {
                            oAppBindingContext.attachDataReceived(fnOnDataReceived);
                            return;
                        }

                        oView.bindElement({
                            events: {
                                dataReceived: fnOnDataReceived
                            },
                            path: that.sEntityPath
                        });

                    });
            }


        },

        onAddNotifLongTextPressed: function(oEvent) {
            if (this._oNotifLongText && this._oNotifLongText.destroy) {
                this._oNotifLongText.destroy();
            }
            this._oNotifLongText = sap.ui.xmlfragment(
                "zi2d.eam.malfunction.manages1.view.fragment.AddNotifLongTextDialog",
                this
            );
            this.getView().addDependent(this._oNotifLongText);

            this._oNotifLongText.open();

        },

        readNotifLongText: function(sActiveMaintNotif) {
            var that = this;
            this._oKommentarModel.setProperty("/MaintNotificationLongText", "");
            var oUrlParam = {};
            oUrlParam.MaintenanceNotification = sActiveMaintNotif;

            this.getView().getModel("ZEAM_OBJPG_MAINTNOTIFCAT_SRV").callFunction("/GetNotificationLongText", {
                method: "POST",
                urlParameters: oUrlParam,
                success: function(oData) {
                    if (oData) {
                        that._oKommentarModel.setProperty("/MaintNotificationLongText", oData.MaintNotificationLongText);
                    }
                },
                error: function(oResponse) {}
            });
        },

        onSaveNotifLongText: function() {

            var that = this;
            var sNotificationNumber = this.getView().getBindingContext().getObject().MaintenanceNotification;
            var oEntry = {
                "NotificationNumber": sNotificationNumber,
                "ObjectKey": "00000000",
                "ReadOnlyText": "",
                "UpdateText": this._oKommentarModel.getProperty("/NotificationLongText"),
                "IsHistorical": true
            };

            var oModel = this.getModel("ZEAM_NTF_CREATE_SRV");

            oModel.update(
                "/LongTextSet(NotificationNumber='" + sNotificationNumber + "',ObjectKey='00000000')",
                oEntry, {
                    method: "PUT",
                    success: function(data) {
                        that.readNotifLongText(sNotificationNumber);
                        that._oKommentarModel.setProperty("/NotificationLongText", "");
                    },
                    error: function(oResponse) {
                        that._oDataServiceErrorHandling(oResponse);
                        that.onError.bind(that);
                    },
                    merge: false
                });
            this.onCancelAddNotifLongText();
        },

        onCancelAddNotifLongText: function() {
            if (this._oNotifLongText && this._oNotifLongText.isOpen()) {
                this._oNotifLongText.close();
            }
        },

        onExitAddNotifLongTextDialog: function() {
            this._oNotifLongText.destroy();
        },

        onEditHeaderButtonPressed: function() {
            this.getView().getModel("FunctionImportModel").setProperty("/FunctionImport", "EditHeader");
            this.getRouter().navTo("editNotificationHeader", {
                MaintenanceNotification: this.getView().getBindingContext().getProperty("MaintenanceNotification"),
                MaintenanceOrderOperation: this.getModel("appView").getProperty("/MalfunctionReportWorkItem/MaintenanceOrderOperation")
            });
        },

        onEditProblemDetailsButtonPressed: function() {
            this.getRouter().navTo("editProblemDetails", {
                MaintenanceNotification: this.getView().getBindingContext().getProperty("MaintenanceNotification")
            });
        },

        onEditMalfunctionDetailsButtonPressed: function() {
            this.getRouter().navTo("editMalfunctionDuration", {
                MaintenanceNotification: this.getView().getBindingContext().getProperty("MaintenanceNotification")
            });
        },

        selectReasonForUserAction: function(mActionData, mActionBaseUrlParameters, oControl) {
            var bSelectionIsMandatory = (mActionData.EAMReasonCodeRequirement === "1..1" || mActionData.EAMReasonCodeRequirement === "1..*");

            return new Promise(function(resolve, reject) {
                var oCodesList = new sap.m.List({
                    mode: mActionData.EAMReasonCodeRequirement.indexOf("*") !== -1 ? "MultiSelect" : "SingleSelectLeft",
                    includeItemInSelection: true,
                    items: {
                        path: "/C_MalfunctionDetailCodesVH",
                        filters: [new sap.ui.model.Filter("InspectionCatalog", "EQ", mActionData.ReasonCodeCatalog)].concat(mActionData.ReasonCodeCatalogProfile ? [
                            new sap.ui.model.Filter("CatalogProfile", "EQ", mActionData.ReasonCodeCatalogProfile)
                        ] : []),
                        template: new sap.m.StandardListItem({
                            title: "{InspectionCodeText}"
                        })
                    }
                });

                var oPopover = new sap.m.ResponsivePopover({
                    placement: "Top",
                    contentWidth: "20rem",
                    contentHeight: "18rem",
                    title: "{i18n>xtit.selectReasonForUserAction}",
                    beginButton: new sap.m.Button({
                        text: "{i18n>xbut.ok}",
                        enabled: !bSelectionIsMandatory,
                        press: function() {
                            resolve(oCodesList.getSelectedContexts());
                            oPopover.close();
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: "{i18n>xbut.cancel}",
                        press: function() {
                            oPopover.close();
                        }
                    }),
                    beforeClose: function() {
                        reject(false);
                    },
                    content: [oCodesList]
                });

                if (bSelectionIsMandatory) {
                    oCodesList.attachSelectionChange(function() {
                        oPopover.getBeginButton().setEnabled(this.getSelectedItems().length > 0);
                    });
                }

                this.getView().addDependent(oPopover);
                oPopover.openBy(oControl);
            }.bind(this)).then(function(aSelectedItems) {
                var that = this;
                if (aSelectedItems.length === 0) {
                    return Promise.resolve();
                }

                return Promise.resolve({
                    actionParameters: jQuery.extend(mActionBaseUrlParameters, {
                        Reasoncodegroup: aSelectedItems[0].getProperty("InspectionCodeGroup"),
                        Reasoncode: aSelectedItems[0].getProperty("InspectionCode")
                    }),
                    all: (aSelectedItems.length > 1 ? jQuery.proxy(jQuery.map, that, aSelectedItems.slice(1), function(oContext) {
                        return new Promise(function(resolve, reject) {
                            this.getModel().callFunction("/C_MaintNotificationTPPerform_user_action", {
                                method: "POST",
                                urlParameters: jQuery.extend(mActionBaseUrlParameters, {
                                    Reasoncodegroup: oContext.getProperty("InspectionCodeGroup"),
                                    Reasoncode: oContext.getProperty("InspectionCode"),
                                    Isadditionalreason: true
                                }),
                                success: resolve,
                                error: reject
                            });
                        }.bind(this));
                    }.bind(this)) : null)
                });
            }.bind(this));
        },

        _refreshAttachmentComponent: function(sMaintenanceNotification) {
            var aAttachmentComponentContent = this.getView().byId("malfuncManageAttachmentsSubSection").getContent();
            if (aAttachmentComponentContent && aAttachmentComponentContent.length > 0 && aAttachmentComponentContent[0]) {
                var sActiveMaintNotif = jQuery.sap.padLeft(sMaintenanceNotification, "0", 12); // Append leading zeros to Notification Id
                var oAttachmentComponent = aAttachmentComponentContent[0];
                // Switch to display mode in case Notifiation is no longer editable
                var sMode = Constants.ATTACHMENT_SERVICE.MODE.DISPLAY;
                if (this.getModel("app").getProperty("/isNotificationEditAllowed")) {
                    sMode = Constants.ATTACHMENT_SERVICE.MODE.CREATE;
                }
                oAttachmentComponent.getComponentInstance().refresh(sMode,
                    Constants.ATTACHMENT_SERVICE.OBJECT_TYPES.NOTIFICATION, sActiveMaintNotif);
            }
        },

        _refreshOverallStatus: function() {
            this.getModel().read(this.sEntityPath, {
                urlParameters: {
                    $expand: "to_OverallJobStatus,to_OverallJobStatus/to_OverallStatus",
                    $select: "to_OverallJobStatus,to_OverallJobStatus/to_OverallStatus/EAMOverallStatus_Text"
                }
            });
        },

        _refreshWorkItemOverallStatus: function(sMaintOrderOperationInternalID) {
            var aOperations = this.getAllLoadedEntities("ZC_MaintOrderOperationTP").filter(function(oOperation) {
                return sMaintOrderOperationInternalID === oOperation.MaintOrderOperationInternalID;
            });

            if (!aOperations) {
                return;
            }

            if (aOperations.length > 0) {
                var oModel = this.getModel();
                oModel.read(oModel.createKey("/ZC_MaintOrderOperationTP", {
                    MaintenanceOrder: aOperations[0].MaintenanceOrder,
                    MaintenanceOrderOperation: aOperations[0].MaintenanceOrderOperation,
                    DraftUUID: Constants.INITIAL_DRAFT_UUID,
                    IsActiveEntity: true
                }), {
                    urlParameters: {
                        $expand: "to_OverallStatus",
                        $select: "EAMOverallObjectStatus,to_OverallStatus/EAMOverallStatus_Text"
                    }
                });
            }
        },

        _refreshAllWorkItemOverallStatuses: function(sMaintenanceOrder, bRetrvFinalConfFlag) {
            var aFilters = jQuery.map(this.getAllLoadedEntities("ZC_MaintOrderOperationTP"), function(oOperation) {
                return oOperation.MaintenanceOrder === sMaintenanceOrder ? new sap.ui.model.Filter("MaintenanceOrderOperation", sap.ui.model.FilterOperator
                    .EQ, oOperation.MaintenanceOrderOperation) : null;
            });

            if (!aFilters.length) {
                return;
            }

            this.getModel().read("/ZC_MaintOrderOperationTP", {
                filters: [new sap.ui.model.Filter("MaintenanceOrder", sap.ui.model.FilterOperator.EQ, sMaintenanceOrder),
                    new sap.ui.model.Filter("IsActiveEntity", sap.ui.model.FilterOperator.EQ, true),
                    new sap.ui.model.Filter({
                        filters: aFilters
                    }, false)
                ],
                urlParameters: {
                    $expand: "to_OverallStatus",
                    $select: (bRetrvFinalConfFlag ? "IsFinallyConfirmed," : "") + "EAMOverallObjectStatus,to_OverallStatus/EAMOverallStatus_Text"
                }
            });
        },

        _loadNextActions: function(sMaintNotifInternalID) {
            var oAppModel = this.getModel("app"),
                aPromises = [],
                that = this;

            aPromises.push(new Promise(function(resolve, reject) {
                that.getModel().read("/ZI_MaintenanceJobAndWorkItem/$count", {
                    filters: [new sap.ui.model.Filter("MaintenanceJobInternalID", sap.ui.model.FilterOperator.EQ, sMaintNotifInternalID),
                        new sap.ui.model.Filter("ObjectType", sap.ui.model.FilterOperator.EQ, "OVG")
                    ],
                    urlParameters: {
                        $top: 1
                    },
                    success: resolve,
                    error: reject
                });
            }));

            Promise.all(aPromises).then(function(aResults) {
                var oData = aResults[0],
                    iConfirmedWorkItemsCount = aResults[1],
                    aActions = [],
                    aActionsFromJobHeader = [],
                    bInConfirmationMode = false,
                    bUserHasWorkItem = false,
                    iHighestSequence = 0;

                if (oData && oData.results) {
                    jQuery.each(oData.results, function(i, oEntity) {
                        var sObjectType = oEntity.StatusObject.substring(0, 2);

                        if (oEntity.MaintWkItmIsInConfirmationMode === true) {
                            bInConfirmationMode = true;
                        }

                        if (sObjectType === "OV") {
                            bUserHasWorkItem = true;
                        }

                        if (sObjectType === "OR" || sObjectType === "QM") {
                            // only keep actions if sequence is highest found so far and actually has a follow-up phase
                            if (oEntity.to_OverallStatus && oEntity.to_OverallStatus.EAMOverallStatusSequence && oEntity.to_OverallStatus.EAMOverallStatusSequence >
                                iHighestSequence && oEntity.EAMNextPrimaryOverallStatus) {
                                iHighestSequence = oEntity.to_OverallStatus.EAMOverallStatusSequence;
                                aActionsFromJobHeader = [];
                            } else {
                                return;
                            }
                        }

                        if (oEntity.to_NextViaAction && oEntity.to_NextViaAction.results && oEntity.to_NextViaAction.results.length > 0) {
                            jQuery.each(oEntity.to_NextViaAction.results, function(j, oAction) {
                                oAction.StatusObject = oEntity.StatusObject;

                                if (sObjectType === "OR" || sObjectType === "QM") {
                                    aActionsFromJobHeader.push(oAction);
                                } else {
                                    aActions.push(oAction);
                                }
                            });
                        }
                    });
                }

                if (bUserHasWorkItem === false && iConfirmedWorkItemsCount > 0) {
                    // User has no involvement but there is at least one work item in confirmation mode
                    bInConfirmationMode = true;
                }

                oAppModel.setProperty("/isInConfirmationMode", bInConfirmationMode);
                oAppModel.setProperty("/actions", []);
            });
        },

        readOrderAttachments: function(sOrder) {
            var that = this;
            that.getModel("appView").setProperty("/OrderAttachmentSet", []);
            //Zum testen sOrder = "2000444";
            this.getModel().read("/OrderAttachmentSet", {
                filters: [new sap.ui.model.Filter("Order", "EQ", sOrder)],
                success: function(oData) {
                    if (oData) {
                        var aOrderAttachmentSet = oData.results;
                        aOrderAttachmentSet.forEach(function(oAttachment) {
                            oAttachment.url = oAttachment.__metadata.media_src;
                        });

                        that.getModel("appView").setProperty("/OrderAttachmentSet", aOrderAttachmentSet);
                    }
                },
                error: function(oResponse) {
                    that._oDataServiceErrorHandling(oResponse);
                    that.onError.bind(that);
                }
            });
        },

        onTechObAttachmentClicked: function(oEvent) {
            var url = oEvent.getSource().data("url");
            sap.m.URLHelper.redirect(url, true);
        }

    });

});
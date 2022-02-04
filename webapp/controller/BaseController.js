sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessagePopover",
    "sap/m/MessagePopoverItem",
    "zi2d/eam/malfunction/manages1/util/Constants",
    "sap/ui/core/routing/History",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageView",
    "sap/m/MessageItem",
    "sap/ui/generic/app/ApplicationController",
    "zi2d/eam/malfunction/manages1/util/OData",
    "sap/ui/core/routing/HashChanger"
], function(Controller, MessagePopover, MessagePopoverItem, Constants, History, MessageBox, MessageToast, Filter,
    FilterOperator, MessageView, MessageItem, ApplicationController, ODataUtil, HashChanger) {
    "use strict";

    var oI18nBundle, oUserDefaults;

    return Controller.extend("zi2d.eam.malfunction.manages1.controller.BaseController", {
        _oI18nBundle: null,

        getRouter: function() {
            if (typeof this.oParentBlock !== "undefined") {
                return sap.ui.core.Component.getOwnerComponentFor(this.oParentBlock).getRouter();
            }
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        getModel: function(sModel) {
            return this.getView().getModel(sModel);
        },

        getAppContainer: function() {
            return sap.ui.core.Component.getOwnerComponentFor(this.getView()).getRootControl().byId("pmMalfunctionManageAppContainer");
        },

        getI18nBundle: function() {
            if (!oI18nBundle) {
                oI18nBundle = this.getModel("i18n").getResourceBundle();
            }
            return oI18nBundle;
        },

        getDraftApplicationController: function() {
            if (!this._oDraftApplicationController) {
                this._oDraftApplicationController = new ApplicationController(this.getModel(), this.getView());
            }

            return this._oDraftApplicationController;
        },

        getODataUtil: function() {
            if (!this._oDataUtil) {
                this._oDataUtil = new ODataUtil(this.getModel());
            }

            return this._oDataUtil;
        },

        getStartupParameter: function(sKey) {
            return "manageJobs";
        },

        determineStartupIntent: function(sNavTarget) {
            var urlParsingService = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService && sap.ushell.Container.getService(
                    "CrossApplicationNavigation"),
                sIntent;

            if (urlParsingService && sNavTarget === this.getStartupParameter("target")) {
                var sHash = urlParsingService.hrefForAppSpecificHash("/"),
                    aHashParts = sHash.match(/#[\w-]+/);

                if (aHashParts) {
                    sIntent = aHashParts[0];
                }
            }

            if (!sIntent) {
                switch (sNavTarget) {
                    case "create":
                        sIntent = "#MaintenanceJob-reportMalfunction";
                        break;
                    case "manageJobs":
                        sIntent = "#MaintenanceJob-manageWorkItems";
                        break;
                    case "manage":
                        sIntent = "#MaintenanceJob-manageMalfunction";
                        break;
                }
            }

            return sIntent;
        },

        getAllLoadedEntities: function(sEntityName) {
            var oData = this.getModel().getProperty("/");

            return jQuery.map(oData, function(oEntityData, sEntityKey) {
                return jQuery.sap.startsWith(sEntityKey, sEntityName) ? oEntityData : undefined;
            });
        },

        getUserDefaults: function() {
            if (oUserDefaults) {
                return oUserDefaults;
            }

            var oModel = this.getModel();

            oUserDefaults = new Promise(function(resolve, reject) {
                oModel.metadataLoaded().then(function() {
                    oModel.read("/C_EAMUserDefaultValues", {
                        success: resolve,
                        error: reject
                    });
                });
            }).then(function(oResponse) {
                return Promise.resolve(oResponse.results[0]);
            });
            return oUserDefaults;
        },

        dataAvailable: function(sEntityName, oKeys, bWait) {
            var that = this,
                sKey;

            if (oKeys) {
                try {
                    var oModel = this.getOwnerComponent().getModel();
                    sKey = oModel.createKey(sEntityName, oKeys);
                } catch (e) {
                    if (bWait === false || !oModel) {
                        return Promise.reject();
                    } else {
                        // one-time recursive call, assuming $metadata hasn't been loaded yet
                        return oModel.metadataLoaded().then(function() {
                            this.dataAvailable(sEntityName, oKeys, false);
                        }.bind(this));
                    }
                }
            }

            return new Promise(function(resolve, reject) {
                // "no need to wait" case:
                if (sKey) {
                    var oEntity = that.getModel().getObject("/" + sKey);
                    if (oEntity !== undefined) {
                        resolve(oEntity);
                        return;
                    }
                } else {
                    var aEntities = that.getAllLoadedEntities(sEntityName);
                    if (aEntities && aEntities.length > 0) {
                        resolve(aEntities);
                        return;
                    }
                }

                if (bWait === false) {
                    reject();
                    return;
                }

                var fnOnRequestCompleted = function(oEvent) {
                    var sUrl = oEvent.getParameter("url"),
                        iStatusCode = oEvent.getParameter("response").statusCode;

                    if (iStatusCode >= 400) {
                        this.getOwnerComponent().getModel().detachRequestCompleted(fnOnRequestCompleted, this);
                        reject();
                        return;
                    }

                    if (iStatusCode >= 200 && jQuery.sap.startsWith(sUrl, sEntityName) && sUrl.indexOf("$count") === -1) {
                        this.getOwnerComponent().getModel().detachRequestCompleted(fnOnRequestCompleted, this);
                        if (sKey) {
                            resolve(this.getOwnerComponent().getModel().getProperty("/" + sKey));
                        } else {
                            resolve(this.getAllLoadedEntities(sEntityName));
                        }
                    }
                };

                that.getOwnerComponent().getModel().attachRequestCompleted(fnOnRequestCompleted, that);
            });
        },

        parentBindingContextAvailable: function(sEntityName) {
            var that = this;

            return new Promise(function(resolve, reject) {
                var fnOnRequestCompleted = function() {
                    var oBindingContext = this.getView().getParent().getBindingContext();

                    if (!oBindingContext) {
                        return;
                    }

                    if (jQuery.sap.startsWith(oBindingContext.getPath(), "/" + sEntityName)) {
                        this.getOwnerComponent().getModel().detachRequestCompleted(fnOnRequestCompleted, this);
                        resolve(this.getView().getParent().getBindingContext());
                    }
                };

                if (that.getView().getParent().getBindingContext() === undefined) {
                    try {
                        var oModel = that.getOwnerComponent().getModel();
                    } catch (e) {
                        reject();
                    }

                    oModel.attachRequestCompleted(fnOnRequestCompleted, that);
                } else {
                    // can resolve right away, no need to wait
                    resolve(that.getView().getParent().getBindingContext());
                }
            });
        },

        bindingContextAvailable: function(sEntityName) {
            var that = this;
            return new Promise(function(resolve) {
                var fnRequestCompleted = function() {
                    if (this.getView().getBindingContext() !== undefined && jQuery.sap.startsWith(this.getView().getBindingContext().getPath(),
                            "/" + sEntityName)) {
                        this.getModel().detachRequestCompleted(fnRequestCompleted);
                        resolve(this.getView().getBindingContext());
                    }
                }.bind(that);

                if (that.getView().getBindingContext() === undefined) {
                    that.getModel().attachRequestCompleted(fnRequestCompleted);
                } else {
                    resolve(that.getView().getBindingContext());
                }
            });
        },

        hasErrors: function() {
            var aMessages = this.getModel("message").getData();

            if (!aMessages) {
                return false;
            }

            for (var i in aMessages) {
                if (aMessages[i].type === sap.ui.core.MessageType.Error) {
                    return true;
                }
            }
            return false;
        },

        onError: function() {
            var aMessages = this.getModel("message").getProperty("/");

            var aErrorMessages = aMessages.filter(function(oMessage) {
                return (oMessage.getType() === sap.ui.core.MessageType.Error);
            });

            if (arguments[0] && !(arguments[0].response && arguments[0].response.statusCode) && !arguments[0].statusCode) {
                // is internal error (e.g. failed promise)
                var oI18NModel = this.getModel("i18n"),
                    oTargetHandler = this.getRouter().getTargetHandler(),
                    sMessage;

                oTargetHandler.setCloseDialogs(false);

                if (typeof arguments[0] !== "string") {
                    if (arguments[0].message) {
                        sMessage = arguments[0].message;
                    } else if (arguments[0].response && arguments[0].response.message) {
                        sMessage = arguments[0].response.message;
                    } else {
                        sMessage = arguments[0].toString();
                    }
                }

                MessageBox.show(typeof arguments[0] === "string" ? arguments[0] : this.getI18nBundle().getText("ymsg.internalError"), {
                    icon: MessageBox.Icon.ERROR,
                    details: sMessage,
                    title: oI18NModel.getProperty("xtit.error"),
                    actions: sap.m.MessageBox.Action.CLOSE,
                    onClose: function() {
                        this.getModel("app").setProperty("/isDialogBusy", false);
                        this.getModel("app").setProperty("/isBusy", false);
                        oTargetHandler.setCloseDialogs(true);
                        this.fireEvent("errorMessageDialogClosed");
                    }.bind(this)
                });
            } else if (typeof arguments[0] !== "undefined" && arguments[0] === false) {
                this.getModel("app").setProperty("/isDialogBusy", false);
                this.getModel("app").setProperty("/isBusy", false);
                this.fireEvent("errorMessageDialogClosed");
            } else if (aErrorMessages.length > 0) {
                var sDialogText,
                    oI18nModel = this.getModel("i18n");
                if (aErrorMessages.length === 1) {
                    sDialogText = aErrorMessages.shift().message;
                } else {
                    sDialogText = oI18nModel.getProperty("ymsg.errorsOccurredDuringSave");
                }

                var oDialog = this.createMessageViewDialog({
                    title: oI18nModel.getProperty("xtit.error"),
                    message: sDialogText,
                    state: sap.ui.core.ValueState.Error
                });
                oDialog.attachAfterClose(function() {
                    sap.ui.getCore().getMessageManager().removeAllMessages();
                    this.getModel("app").setProperty("/isBusy", false);
                    this.getModel("app").setProperty("/isDialogBusy", false);
                    this.fireEvent("errorMessageDialogClosed");
                }.bind(this));
                oDialog.open();
            } else {
                // is connection error
                MessageBox.error(this.getI18nBundle().getText("ymsg.connectionError"), {
                    onClose: function() {
                        this.getModel("app").setProperty("/isBusy", false);
                        this.getModel("app").setProperty("/isDialogBusy", false);
                        this.fireEvent("errorMessageDialogClosed");
                    }.bind(this)
                });
            }
        },

        showMessages: function() {
            var aMessages = this.getModel("message").getProperty("/").sort(function(oFirstMessage, oSecondMessage) {
                var bFirstIsSevere = (oFirstMessage.getType() !== sap.ui.core.MessageType.Information && oFirstMessage.getType() !== sap.ui.core
                        .MessageType.Success),
                    bSecondIsSevere = (oSecondMessage.getType() !== sap.ui.core.MessageType.Information && oSecondMessage.getType() !== sap.ui.core
                        .MessageType.Success),
                    bFirstIsFromApp = oFirstMessage.getCode().indexOf("EAM_ODATA") === 0,
                    bSecondIsFromApp = oSecondMessage.getCode().indexOf("EAM_ODATA") === 0;

                if (bFirstIsSevere && bSecondIsSevere) {
                    return 0;
                } else if (bFirstIsSevere) {
                    return -2;
                } else if (bSecondIsSevere) {
                    return 2;
                } else if (bFirstIsFromApp && bSecondIsFromApp) {
                    return 0;
                } else if (bFirstIsFromApp) {
                    return -1;
                } else if (bSecondIsFromApp) {
                    return 1;
                } else {
                    return 0;
                }
            });

            if (aMessages.length === 0) {
                return undefined;
            }

            if (aMessages[0].getType() === sap.ui.core.MessageType.Information || aMessages[0].getType() === sap.ui.core.MessageType.Success) {
                MessageToast.show(aMessages[0].message);
                sap.ui.getCore().getMessageManager().removeAllMessages();
                return undefined;
            } else if (aMessages[0].getType() === sap.ui.core.MessageType.Error) {
                return this.onError();
            }

            var oI18NModel = this.getModel("i18n");
            var oDialog = this.createMessageViewDialog({
                title: oI18NModel.getProperty("xtit.success"),
                message: oI18NModel.getProperty("ymsg.warningsOccurredDuringSave"),
                state: sap.ui.core.ValueState.Warning
            });
            oDialog.attachAfterClose(function() {
                sap.ui.getCore().getMessageManager().removeAllMessages();
            });
            oDialog.open();
        },

        createMessageViewDialog: function(mParameters) {
            var oView = this.getView(),
                iNumberOfMessages = this.getModel("message").getProperty("/").length > 0,
                oMessageView;

            if (iNumberOfMessages > 0) {
                oMessageView = new MessageView({
                    items: {
                        path: "message>/",
                        template: new MessageItem({
                            longtextUrl: "{message>descriptionUrl}",
                            title: "{message>message}",
                            type: "{message>type}"
                        })
                    }
                }).addStyleClass("sapUiSmallMarginTop");
            }

            var oText = new sap.m.Text({
                text: mParameters.message
            });

            var oDialog = new sap.m.Dialog({
                contentWidth: "35rem",
                title: mParameters.title,
                type: sap.m.DialogType.Message,
                state: mParameters.state,
                verticalScrolling: false,
                content: [new sap.ui.layout.VerticalLayout({
                    content: [
                        oText,
                        oMessageView ?
                        new sap.m.Link({
                            text: this.getI18nBundle().getText("xlnk.showDetails"),
                            press: function(oEvent) {
                                var oEventSource = oEvent.getSource();
                                oEventSource.setVisible(false);
                                oDialog.setContentHeight("25rem");
                                oDialog.setStretch(oView.getModel("device").getProperty("/system/phone"));
                                oDialog.addContent(oMessageView);
                            },
                            ariaLabelledBy: oText
                        }).addStyleClass("sapUiSmallMarginTop") : undefined
                    ]
                })],
                beginButton: mParameters.beginButton,
                endButton: mParameters.endButton || new sap.m.Button({
                    text: "{i18n>xbut.ok}",
                    press: function() {
                        oDialog.close();
                    },
                    ariaLabelledBy: oMessageView ? undefined : oText
                }),
                beforeOpen: function() {
                    oView.addDependent(oDialog);
                },
                afterClose: function() {
                    oView.removeDependent(oDialog);
                }
            });

            return oDialog;
        },

        /**
         * Event handler to open the message popover to display the messages in the message model
         * @public
         */
        onMessagesButtonPress: function(oEvent) {
            var oMessagesButton = oEvent.getSource();
            if (!this._messagePopover) {
                this._messagePopover = new MessagePopover({
                    items: {
                        path: "message>/",
                        template: new MessagePopoverItem({
                            description: "{message>description}",
                            type: "{message>type}",
                            title: "{message>message}"
                        })
                    }
                });
                oMessagesButton.addDependent(this._messagePopover);
            }
            this._messagePopover.toggle(oMessagesButton);
        },

        prepareTransaction: function() {
            var oModel = this.getModel();

            this.getCleanState(oModel);
            return oModel.metadataLoaded();
        },

        getCleanState: function(oModel) {
            oModel.resetChanges();
            sap.ui.getCore().getMessageManager().removeAllMessages();
        },

        /**
         * Initialize the attachment service component
         * @public
         * @param {string} sMode - attachment service mode (Create, Edit, Display)
         * @param {string} sComponentContainerId - Id of attachment component container
         * @param {string} sComponentId - Id of attachment component
         * @param {string} sObjectKey - DMS Object key 
         * @param {function} fnOnUpload - Handle upload
         * @return {sap.ui.core.ComponentContainer}
         */
        initAttachmentComponent: function(sMode, sComponentContainerId, sComponentId, sObjectKey, fnOnUpload) {
            var oAttachmentComponentPromise = this.getOwnerComponent().createComponent({
                usage: "attachmentReuseComponent",
                settings: {
                    mode: sMode,
                    objectType: Constants.ATTACHMENT_SERVICE.OBJECT_TYPES.NOTIFICATION,
                    objectKey: sObjectKey,
                    onupload: (fnOnUpload) ? [fnOnUpload] : [function() {}]
                }
            });
            var oComponentContainer = this.byId(sComponentContainerId);
            oAttachmentComponentPromise.then(function(successValue) {
                oComponentContainer.setComponent(successValue);
            });
            return oComponentContainer;
        },

        onNavBack: function() {
            sap.ui.getCore().getMessageManager().removeAllMessages();
            var oHistory, sPreviousHash;
            oHistory = History.getInstance();
            sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo("", {}, true /*no history*/ );
            }
        },

        showDeletionConfirmationDialog: function(sEntityDesc, sAltText) {
            var that = this;
            var sMessage = (sEntityDesc) ? that.getI18nBundle().getText("ymsg.deleteEntity", [sEntityDesc]) : sAltText;
            return new Promise(function(resolve, reject) {
                MessageBox.show(sMessage, {
                    icon: MessageBox.Icon.WARNING,
                    title: that.getI18nBundle().getText("xtit.delete"),
                    actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                    onClose: function(sAction) {
                        if (sAction === "DELETE") {
                            resolve();
                        } else {
                            reject();
                        }
                    }
                });
            });
        },

        isFeatureToggleActive: function(sFeatureToggle) {
            var that = this;
            return new Promise(function(resolve, reject) {
                that.getModel().read("/I_FeatureToggle", {
                    filters: [new Filter("FeatureToggle", FilterOperator.EQ, sFeatureToggle)],
                    success: function(oData) {
                        if (oData && oData.results[0]) {
                            if (oData.results[0].Status === "X") {
                                resolve();
                            } else {
                                reject();
                            }
                        } else {
                            return reject();
                        }
                    },
                    error: function() {
                        return reject();
                    }
                });
            });
        },

        getCurrentHash: function() {
            return HashChanger.getInstance().getHash();
        },

        getDisplayJobRegex: function() {
            return new RegExp("^" + this.getRouter().getRoute("displayJob").getPattern().replace(
                /\/{\w*}/, "\\/\\d+") + "$");
        },

        getNotification: function() {
            // Check if Notification is already buffered in OData model, 
            // if yes it is not neccessary to wait for the Notification binding context being available
            var sCurrentHash = HashChanger.getInstance().getHash();
            var sMaintenanceNotification = sCurrentHash.match(/\d+/)[0];

            // var sNotificationKey = this.getModel().createKey("/C_MaintNotificationTP", {
            //     MaintenanceNotification: sMaintenanceNotification,
            //     DraftUUID: Constants.INITIAL_DRAFT_UUID,
            //     IsActiveEntity: true
            // });
            var sNotificationKey = this.getOwnerComponent().getModel().createKey("/ZC_MaintNotificationTP", {
                MaintenanceNotification: sMaintenanceNotification
            });
            var oMaintenanceNotification = this.getOwnerComponent().getModel().getObject(sNotificationKey);
            return (oMaintenanceNotification) ? oMaintenanceNotification : this.parentBindingContextAvailable(
                "ZC_MaintNotificationTP");
        },

        _CallFunction: function(sPath, sMethod, oUrlParam, sModel) {
            var that = this;
            var oModel;

            if (sModel) {
                oModel = this.getView().getModel(sModel);
            } else {
                oModel = this.getView().getModel(sModel); // default
            }

            var oErg = {};
            oModel.callFunction(sPath, {
                method: sMethod,
                urlParameters: oUrlParam,
                success: function(oData, test) {

                    that.getModel("app").setProperty("/isDialogBusy", false);
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
        },

        resetAppView: function() {
            this.getModel("appView").setProperty("/OperationWorkCenter", "");
            this.getModel("appView").setProperty("/OperationDescription", "");
            this.getModel("appView").setProperty("/Material", "");
            this.getModel("appView").setProperty("/StorageLocation", "");
            this.getModel("appView").setProperty("/Requirementquantityinbaseunit", "");
            this.getModel("appView").setProperty("/BaseUnit", "");
        },

        onBeforeRebindSmartTable: function(oEvent) {
            var binding = oEvent.getParameter("bindingParams");
            if (binding.filters) {
                binding.filters.forEach(function(oFilter) {
                    oFilter.sOperator = sap.ui.model.FilterOperator.Contains;
                    if (oFilter.oValue1) {
                        oFilter.oValue1 = oFilter.oValue1.toUpperCase();
                    }
                });
            }
        }

    });

});
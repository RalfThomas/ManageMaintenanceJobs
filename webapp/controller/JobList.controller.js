sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "zi2d/eam/malfunction/manages1/util/VariantHelper",
    "zi2d/eam/malfunction/manages1/controls/ExtScanner"
], function(BaseController, MessageBox, VariantHelper, ExtScanner) {
    "use strict";
    return BaseController.extend("zi2d.eam.malfunction.manages1.controller.JobList", {

        _oVariantHelper: null,
        _oVariantManagement: null,
        _oFilterBar: null,

        onInit: function() {
            this._oFilterBar = this.byId("malfuncManageWorkItemListSmartFilterBar");
            this._oVariantManagement = this.byId("malfuncManageWorkItemListSmartVariant");
            this._oVariantHelper = new VariantHelper(this._oVariantManagement, this._oFilterBar);

            this.oScanner = new ExtScanner({
                settings: true,
                valueScanned: this.onScanned.bind(this),
                decoderKey: 'PDF417-UII',
                decoders: this.getDecoders(),
            });

        },

        onFilterBarInitialising: function() {
            var mComponentData = this.getOwnerComponent().getComponentData(),
                sVariantKey = null;

            if (mComponentData && mComponentData.startupParameters && mComponentData.startupParameters.variantKey && mComponentData.startupParameters
                .target && mComponentData.startupParameters.target[0] === "manageJobs") {
                sVariantKey = mComponentData.startupParameters.variantKey[0];
            }

            if (sVariantKey) {
                this._oVariantManagement.setInitialSelectionKey(sVariantKey);
            }
        },

        onVariantSave: function(oEvent) {},

        onAfterVariantSaved: function(oEvent) {
            this._oVariantHelper.updateServiceUrlInBookmarks(this.determineStartupIntent("manageJobs"));
        },

        onHandleRowPress: function(oEvent) {
            var oI18NModel = this.getModel("i18n");
            var oBindingContext = oEvent.getSource().getBindingContext();
            var MaintenanceNotification = oBindingContext.getProperty("MaintenanceNotification");
            var MaintenanceOrderOperation = oBindingContext.getProperty("MaintenanceOrderOperation");
            var TechnicalObject = oBindingContext.getProperty("TechnicalObject");
            var TechObjIsEquipOrFuncnlLoc = oBindingContext.getProperty("TechObjIsEquipOrFuncnlLoc");

            sap.ui.getCore().getMessageManager().removeAllMessages();
            this.getView().byId("malfuncManageWorkItemListSmartTable").setBusy(true);

            if (MaintenanceNotification === "") {
                MessageBox.show(oI18NModel.getProperty("ymsg.errorMalfunctionEmptyIssue"), {
                    icon: MessageBox.Icon.ERROR,
                    title: oI18NModel.getProperty("xtit.error"),
                    actions: sap.m.MessageBox.Action.OK,
                    onClose: function() {
                        sap.ui.getCore().getMessageManager().removeAllMessages();
                        this.getView().byId("malfuncManageWorkItemListSmartTable").setBusy(false);
                    }.bind(this)
                });
            } else {
                this.getView().byId("malfuncManageWorkItemListSmartTable").setBusy(false);
                this.getModel("appView").setProperty("/TechnicalObjectNumber", TechnicalObject);
                this.getModel("appView").setProperty("/TechObjIsEquipOrFuncnlLoc", TechObjIsEquipOrFuncnlLoc);
                this.getRouter().navTo("displayJob", {
                    MaintenanceNotification: MaintenanceNotification,
                    MaintenanceOrderOperation: MaintenanceOrderOperation
                });
            }
        },

        onFilterBarAssignedFiltersChanged: function(oEvent) {
            this.byId("malfuncManageWorkItemListFilterText").setText(oEvent.getSource().retrieveFiltersWithValuesAsText());
        },

        onScanned: function(oEvent) {
            var oFilter = sap.ui.getCore().byId("container-manages1---malfuncManageViewWorkItemList--malfuncManageWorkItemListSmartFilterBar-filterItemControl_BASIC-TechnicalObjectLabel");
            var aTokens = oFilter.getTokens();
            if (!aTokens) {
                aTokens = [];
            }
            aTokens.push(new sap.m.Token({
                key: oEvent.getParameter('value'),
                text: oEvent.getParameter('value')
            }));
            oFilter.setTokens(aTokens);
        },

        onSearchViaBarcode: function(sTechnicalObjectNumber) {
            if (!sTechnicalObjectNumber || !sTechnicalObjectNumber.length) {
                var sTechnicalObjectNumber = "DEMI-10";
            } else {
                var o = this.getView().byId("pmNotifInputTechnicalObject");
                this._setPropertyTechnicalObjectValid(true);
                o.setObjectNumber(sTechnicalObjectNumber);
            }

        },

        onScan: function() {
            this.oScanner.open();
        },

        getDecoders: function() {
            return [{
                    key: 'PDF417-UII',
                    text: 'PDF417-UII',
                    decoder: this.parserPDF417UII,
                },
                {
                    key: 'text',
                    text: 'TEXT',
                    decoder: this.parserText,
                },
            ];
        },

        parserText: function(oResult) {
            var sText = '';
            var iLength = oResult.text.length;
            for (var i = 0; i !== iLength; i++) {
                if (oResult.text.charCodeAt(i) < 32) {
                    sText += ' ';
                } else {
                    sText += oResult.text[i];
                }
            }
            return sText;
        },

        parserPDF417UII: function(oResult) {
            // we expect that
            // first symbol of UII (S - ASCII = 83) or it just last group
            var sText = oResult.text || '';
            if (oResult.format && oResult.format === 10) {
                sText = '';
                var iLength = oResult.text.length;
                var aChars = [];
                for (var i = 0; i !== iLength; i++) {
                    aChars.push(oResult.text.charCodeAt(i));
                }
                var iStart = -1;
                var iGRCounter = 0;
                var iGroupUII = -1;
                var sTemp = '';
                aChars.forEach(function(code, k) {
                    switch (code) {
                        case 30:
                            if (iStart === -1) {
                                iStart = k;
                                sTemp = '';
                            } else {
                                sText = sTemp;
                                iGRCounter = -1;
                            }
                            break;
                        case 29:
                            iGRCounter += 1;
                            break;
                        default:
                            if (iGRCounter > 2 && code === 83 && iGRCounter > iGroupUII) {
                                sTemp = '';
                                iGroupUII = iGRCounter;
                            }
                            if (iGroupUII === iGRCounter) {
                                sTemp += String.fromCharCode(code);
                            }
                    }
                });
                if (sText) {
                    sText = sText.slice(1);
                }
            }
            return sText;
        }

    });
});
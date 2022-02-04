sap.ui.define([
    "zi2d/eam/malfunction/manages1/controller/BaseController",
    "zi2d/eam/malfunction/manages1/util/Constants",
    "zi2d/eam/malfunction/manages1/util/Notification"
], function(BaseController, Constants, Notification) {

    "use strict";
    return BaseController.extend("zi2d.eam.malfunction.manages1.controller.subview.Attachments", {
        _oAttachmentComponentContainer: null,
        _sCurrentNotification: null,
        _oNotificationUtil: null,

        onInit: function() {
            this.getView().attachModelContextChange(this.onModelContextChange, this);
            this._oNotificationUtil = new Notification();
        },

        onModelContextChange: function() {
            var that = this;
            this.getOwnerComponent().getModel().metadataLoaded()
                .then(this.getNotification.bind(this)).then(function(oJobKeysContext) {
                    var oJobKeys = that._oNotificationUtil.extractOrderandNotification(oJobKeysContext);
                    var sMaintenanceNotification = oJobKeys.MaintenanceNotification;
                    if (sMaintenanceNotification !== that._sCurrentNotification) {
                        that._sCurrentNotification = sMaintenanceNotification;
                        that._initAttachmentComponent(sMaintenanceNotification);
                    }
                });

        },

        _initAttachmentComponent: function(sMaintenanceNotification) {
            if (sMaintenanceNotification) {
                var sActiveMaintNotif = jQuery.sap.padLeft(sMaintenanceNotification, "0", 12); // Append leading zeros to Notification Id

                if (!this._oAttachmentComponentContainer) {
                    this._oAttachmentComponentContainer = this.initAttachmentComponent(Constants.ATTACHMENT_SERVICE.MODE.CREATE,
                        "malfuncManageAttachSrvCompContManage",
                        "malfuncManageAttachSrvCompManage", sActiveMaintNotif);
                } else {
                    this._oAttachmentComponentContainer.getComponentInstance().refresh(Constants.ATTACHMENT_SERVICE.MODE.CREATE,
                        Constants.ATTACHMENT_SERVICE.OBJECT_TYPES.NOTIFICATION, sActiveMaintNotif);
                }
            }
        }

    });
});
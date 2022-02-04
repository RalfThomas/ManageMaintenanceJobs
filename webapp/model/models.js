sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function(JSONModel, Device) {
    "use strict";

    return {

        createDeviceModel: function() {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        createAppModel: function() {
            var oModel = new JSONModel({
                is148sp01orHigher: sap.ui.version.substring(0, 6) !== "1.48.0",
                isBusy: false,
                isDialogBusy: false,
                isFooterVisible: false,
                isInConfirmationMode: false,
                isOrderEditAllowed: true,
                isNotificationEditAllowed: true,
                hasOrderAssigned: false,
                actions: [],
                baseUrl: jQuery.sap.getModulePath("zi2d.eam.malfunction.manages1")
            });
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        }

    };

});
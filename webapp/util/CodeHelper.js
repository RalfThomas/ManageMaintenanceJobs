sap.ui.define(function() {
    "use strict";

    return {

        getThumbnailUrl: function(oModel, sEntitySet, oKey, bHasThumbnail) {
            if (bHasThumbnail) {
                return oModel.sServiceUrl + oModel.createKey(sEntitySet, oKey) + "/$value";
            } else {
                return jQuery.sap.getModulePath("zi2d.eam.malfunction.manages1") + "/img/product_grey_128.png";
            }
        },

        validateCodeInput: function(oEvent) {
            var oSource = oEvent.getSource(),
                oItem = oSource.getSelectedItem(),
                sValue = oSource.getValue();

            if (!oItem && sValue.length > 0) {
                // user left field with invalid input
                oEvent.cancelBubble();

                oSource.fireValidationError({
                    element: oSource,
                    message: this.getI18nBundle().getText("ymsg.selectValidItem")
                });
            } else {
                oSource.fireValidationSuccess({
                    element: oSource
                });
            }
        }

    };
});
sap.ui.define([
    "zi2d/eam/malfunction/manages1/controller/BaseController"
], function(BaseController) {
    "use strict";
    return BaseController.extend("zi2d.eam.malfunction.manages1.controller.NotFound", {
        onInit: function() {
            this.getRouter().getTarget("notFound").attachDisplay(this.onNotFoundDisplay, this);
        },

        onNotFoundDisplay: function() {
            this.getModel("app").setProperty("/isBusy", false);
        }
    });
});
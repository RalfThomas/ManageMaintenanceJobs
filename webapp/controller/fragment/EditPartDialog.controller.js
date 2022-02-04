sap.ui.define([
    "./../DialogController"
], function(DialogController) {
    "use strict";

    return DialogController.extend("zi2d.eam.malfunction.manages1.controller.fragment.EditPartDialog", {

        onInit: function() {
            this.getRouter().getRoute("editPart").attachMatched(this.onEditPartRouteMatched, this);
        },

        onEditPartRouteMatched: function(oEvent) {
            var that = this,
                mArguments = oEvent.getParameter("arguments");

            that.getModel("app").setProperty("/isBusy", true);

            this.prepareTransaction()
                .then(function() {
                    var sKey = that.getModel().createKey("/ZC_MaintOrderComponentTP", {
                        MaintenanceOrder: mArguments.MaintenanceOrder,
                        MaintenanceOrderOperation: mArguments.MaintenanceOrderOperation,
                        MaintenanceOrderComponent: mArguments.MaintenanceOrderComponent
                    });

                    return new Promise(function(resolve, reject) {
                        that.getModel().createBindingContext(sKey, resolve);
                    });
                }).then(function(oBindingContext) {
                    return that.initializeDraftDialog("pmMalfuncManageDialogEditPart", oBindingContext, "malfuncManageSmartFormEditPart");
                }).then(function() {
                    // we now have the dialog open, so we will use isDialogBusy
                    that.getModel("app").setProperty("/isBusy", false);

                }).catch(jQuery.proxy(this.onError, this, true));
        }
    });

});
sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
    "use strict";

    return BaseController.extend("zi2d.eam.malfunction.manages1.controller.App", {
        onInit: function() {
            var oRouter = this.getRouter();
            oRouter.getRoute("initial").attachMatched(this.onInitialRouteMatched, this);

            var oModel = new JSONModel({
                "FunctionImport": ""
            });
            this.getView().setModel(oModel, "FunctionImportModel");

            var oAppModel = new JSONModel({
                "OperationWorkCenter": "",
                "Plant": "",
                "OperationDescription": "",
                "Material": "",
                "Requirementquantityinbaseunit": "",
                "StorageLocation": "",
                "WorkItems": []
            });
            this.getView().setModel(oModel, "appView");
        },

        onInitialRouteMatched: function() {
            var sTarget = this.getStartupParameter("target"),
                oAppContainer = this.byId("pmMalfunctionManageAppContainer"),
                oAppBindingContext = oAppContainer && oAppContainer.getBindingContext();

            switch (sTarget) {
                case "manageJobs":
                    this.getRouter().getTargets().display("manageWorkItem");
                    break;

                    // case "manage":
                    //     this.getRouter().getTargets().display("manageJob");
                    //     break;

                    // case "create":
                    // default:
                    //     this.getRouter().getTargets().display("create", {
                    //         fromRoute: "initial"
                    //     });
                    //     break;
            }

            if (oAppBindingContext) {
                oAppContainer.unbindElement();
            }
        }
    });

});
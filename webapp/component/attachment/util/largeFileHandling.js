sap.ui.define([
    "sap/ui/base/Object", "sap/m/MessageBox"
], function(U, M) {
    "use strict";
    return {
        getFileFromUrl: function(F, d, a, b, c, f, g) {
            var h = false;
            var t = this;
            if (!t._objects) {
                t._objects.oModel = new sap.ui.model.odata.ODataModel(t._serviceUrl, true);
            }
            t._objects.oModel.callFunction("/GetAccessURLWithToken", {
                method: "GET",
                urlParameters: {
                    "ObjectType": t._properties.objectType,
                    "ObjectKey": t._properties.objectKey,
                    "RequestURLForGet": true,
                    "FileId": F,
                    "DocumentInfoRecordDocNumber": d ? d : "",
                    "DocumentInfoRecordDocType": a ? a : "",
                    "DocumentInfoRecordDocPart": b ? b : "",
                    "DocumentInfoRecordDocVersion": c ? c : "",
                    "CountOfTokensRequired": 1
                },
                success: function(D) {
                    var _ = decodeURIComponent(D.results[0].URLToReadAttachment);
                    var e = D.results[0].SecureAccessToken;
                    var T = {
                        key: "X-AccessToken",
                        value: e
                    };
                    if (h) {
                        if (T && T.value) {
                            if (parseInt(D.results[0].FileSize, 10) <= 800000000) {
                                var p = t._serviceUrl + "/OriginalContentSet(Documenttype='" + (
                                    a ? a : ""
                                ) + "',Documentnumber='" + (
                                    d ? d : ""
                                ) + "',Documentpart='" + (
                                    b ? b : ""
                                ) + "',Documentversion='" + (
                                    c ? c : ""
                                ) + "',ApplicationId='" + (
                                    f ? f : ""
                                ) + "',FileId='" + (
                                    F ? F : ""
                                ) + "')/$value";
                                sap.m.URLHelper.redirect(p, true);
                            } else {
                                sap.m.MessageToast.show(t.getView().getModel("i18n").getResourceBundle().getText("MESSAGE_FILE_DOWNLOAD_TOAST"));
                                var i = t._downloadFilePromise(_, D.results[0].Filename, D.results[0].ContentType, T);
                                i.then(function(r, j) {
                                    if (!r) {
                                        t._showErrorMessage(t.getView().getModel("i18n").getResourceBundle().getText("MESSAGE_DOWNLOAD_FAILED"), j);
                                    }
                                });
                            }
                        } else {
                            if (g) {
                                t.downloadviaURL(_, D.results[0].Filename, D.results[0].ContentType);
                            } else {
                                var p = t._serviceUrl + "/OriginalContentSet(Documenttype='" + (
                                    a ? a : ""
                                ) + "',Documentnumber='" + (
                                    d ? d : ""
                                ) + "',Documentpart='" + (
                                    b ? b : ""
                                ) + "',Documentversion='" + (
                                    c ? c : ""
                                ) + "',ApplicationId='" + (
                                    f ? f : ""
                                ) + "',FileId='" + (
                                    F ? F : ""
                                ) + "')/$value";
                                sap.m.URLHelper.redirect(p, true);
                            }
                        }
                    } else {
                        if (g) {
                            t.downloadviaURL(_, D.results[0].Filename, D.results[0].ContentType);
                        } else {
                            var p = t._serviceUrl + "/OriginalContentSet(Documenttype='" + (
                                a ? a : ""
                            ) + "',Documentnumber='" + (
                                d ? d : ""
                            ) + "',Documentpart='" + (
                                b ? b : ""
                            ) + "',Documentversion='" + (
                                c ? c : ""
                            ) + "',ApplicationId='" + (
                                f ? f : ""
                            ) + "',FileId='" + (
                                F ? F : ""
                            ) + "')/$value";
                            sap.m.URLHelper.redirect(p, true);
                        }
                    }
                },
                error: function(e) {
                    return (t._showErrorMessage(JSON.parse(e.response.body).error.message.value, ""));
                }
            });
        },
        handleChange: function(e) {},
        finalizeMetadata: function(p, c) {},
        handleUploadPress: function() {
            this.getView().byId("fileUploader").upload();
        }
    };
});
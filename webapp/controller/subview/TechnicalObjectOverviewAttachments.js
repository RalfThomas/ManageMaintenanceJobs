sap.ui.define([
    "sap/ui/base/Object",
    "zi2d/eam/malfunction/manages1/model/formatter",
    "sap/m/MessageBox"
], function(Object, formatter, MessageBox) {
    "use strict";
    return Object.extend("zi2d.eam.malfunction.manages1.controller.subview.TechnicalObjectOverviewAttachments", {
        formatter: formatter,
        _objects: {
            oModel: null
        },
        _properties: {
            objectKey: "",
            objectType: "",
            documentPart: "",
            documentVersion: "",
            documentNumber: "",
            documentType: "",
            mode: "",
            visibleEdit: false,
            visibleDelete: false,
            Attachments: []
        },
        _ACTION: {
            DELETEATTACHMENT: "Delete",
            RENAMEATTACHMENT: "Rename",
            LISTATTACHMENT: "List",
            SAVEATTACHMENT: "Save",
            CANCELATTACHMENT: "Cancel",
            DRAFTATTACHMENT: "Draft",
            COUNTATTACHMENT: "Count"
        },
        _bAttachmentsRetrieved: false,

        onTechObGetAllOriginals: function(sTechnObjectNumber, sTechnObjectType, oAppView) {
            var t = this;
            var T = sTechnObjectType;
            this._properties.objectKey = sTechnObjectNumber;
            switch (T) {
                case "EAMS_EQUI":
                    this._properties.objectType = "EQUI";
                    break;
                case "EAMS_FL":
                    this._properties.objectType = "IFLOT";
                    break;
                default:
                    this._properties.objectType = null;
                    break;
            }
            if (this._properties.objectKey && this._properties.objectType) {
                var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/CV_ATTACHMENT_SRV", true);
                oModel.read("/GetAllOriginals", null, this._prepareUrlParameters(), false, function(d) {
                    t._setOriginal(d, oAppView);
                    t._bAttachmentsRetrieved = true;
                }, function(e) {
                    t._bAttachmentsRetrieved = false;
                    t._showErrorMessage(JSON.parse(e.response.body).error.message.value, "");
                });
            }
        },
        _prepareUrlParameters: function() {
            var k = "ObjectKey='" + this._properties.objectKey + "'";
            var t = "ObjectType='" + this._properties.objectType + "'";
            return k + "&" + t;
        },
        _setOriginal: function(r, oAppView) {
            if (r !== null) {
                var d = [];
                var i = 0,
                    l = r.results.length;
                for (i = 0; i < l; i++) {
                    d.push(this._mapResult(r.results[i]));
                }

                oAppView.setProperty("/TechObAttachments", d);
            }
        },
        _mapResult: function(F) {
            F.CreatedAt = Date(F.CreatedAt).toString().substr(0, 15);
            var o = {
                "content_type": F.__metadata.content_type,
                "CreatedBy": F.FullName,
                "CreatedAt": F.CreatedAt,
                "Filename": F.Filename,
                "url": F.__metadata.media_src,
                "size": parseFloat(F.Filesize),
                "FileId": F.FileId,
                "ApplicationId": F.ApplicationId,
                "Documentnumber": F.Documentnumber,
                "Documenttype": F.Documenttype,
                "Documentversion": F.Documentversion,
                "Documentpart": F.Documentpart
            };
            if (F.Documentnumber && this._properties.documentNumber === "") {
                this._properties.documentPart = F.Documentpart;
                this._properties.documentVersion = F.Documentversion;
                this._properties.documentNumber = F.Documentnumber;
                this._properties.documentType = F.Documenttype;
            }
            return o;
        },
        _showErrorMessage: function(m, a) {
            MessageBox.show(m, {
                icon: sap.m.MessageBox.Icon.ERROR,
                details: a
            });
        }
    });
});
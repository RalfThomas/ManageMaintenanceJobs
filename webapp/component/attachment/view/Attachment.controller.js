sap.ui.define(["sap/m/MessageBox", "sap/ui/core/mvc/Controller", "zi2d/eam/malfunction/manages1/component/attachment/util/largeFileHandling",
        "zi2d/eam/malfunction/manages1/component/attachment/util/assignUnassignDIR",
        "sap/ui/model/Filter",
        "sap/ui/model/Sorter",
        "sap/ui/model/FilterOperator",
        "sap/m/GroupHeaderListItem",
        "sap/ui/core/format/DateFormat", "sap/ui/core/format/FileSizeFormat",
    ],
    function(MessageBox, Controller, LargeFileHandler, assignUnassign, Filter, Sorter, FilterOperator, GroupHeaderListItem) {
        "use strict";

        return Controller.extend("zi2d.eam.malfunction.manages1.component.attachment.view.Attachment", {
            //	_mode is a constant object. Do not change any value while coding
            _MODE: {
                CREATE: "I",
                DISPLAY: "D",
                CHANGE: "C"
            },
            //	_action is a constant object. Do not change any value while coding
            _ACTION: {
                DELETEATTACHMENT: "Delete",
                RENAMEATTACHMENT: "Rename",
                LISTATTACHMENT: "List",
                SAVEATTACHMENT: "Save",
                CANCELATTACHMENT: "Cancel",
                DRAFTATTACHMENT: "Draft",
                COUNTATTACHMENT: "Count",
                CREATEURL: "CreateUrl"
            },
            onInit: function() {
                // _properties has been here from outside the onInit function to make it instance level. Otherwise, it is static for the controller			
                try {
                    this._serviceUrl = this.getURLForService();
                } catch (error) {
                    jQuery.sap.log.error(error);
                    this._serviceUrl = "/sap/opu/odata/sap/CV_ATTACHMENT_SRV";
                }
                this._properties = {
                    semanticObject: "",
                    objectKey: "",
                    objectType: "",
                    documentPart: "",
                    documentVersion: "",
                    documentNumber: "",
                    documentType: "",
                    mode: "",
                    visibleEdit: false,
                    visibleDelete: false
                };
                this._objects = {
                    oModel: undefined
                };

                this._fieldControl = {
                    "_VisibleAttributes": {},
                    "_VisibleActions": {}
                };

                this._fieldControl._VisibleAttributes.UPLOADEDBY = true;
                this._fieldControl._VisibleAttributes.UPLOADEDON = true;
                this._fieldControl._VisibleAttributes.FILESIZE = true;
                this._fieldControl._VisibleAttributes.ENABLELINK = true;
                this._fieldControl._VisibleAttributes.ATTACHMENTSTATUS = true;
                this._fieldControl._VisibleAttributes.ATTACHMENTTITLE = true;
                this._fieldControl._VisibleAttributes.SOURCE = true;
                this._fieldControl._VisibleAttributes.DIRDETAILS = false;
                this._fieldControl._VisibleActions.RENAME = true;
                this._fieldControl._VisibleActions.DELETE = true;
                this._fieldControl._VisibleActions.ADD = true;
                this._fieldControl._VisibleActions.ADDURL = true;
                this._fieldControl._VisibleActions.DOWNLOAD = false;

                this.oResult = {
                    status: "",
                    fileName: ""
                };
                this.uploadCount = 0;
                this.uploadCountSuccess = 0;
                this.uploadCountFailed = 0;
                this.uploadCountTerminated = 0;

                this._objects.oModel = new sap.ui.model.odata.ODataModel(this._serviceUrl, true);
                this.oModel = new sap.ui.model.odata.v2.ODataModel(this._serviceUrl, {
                    defaultBindingMode: " "
                });
                //********************************************************************************************
                //*******************Set the properties of the buttons in the toolbar  **********************/
                this.checkedInStatusShow = false;
                this.itemforcheckingin = {};
                var oJSONModel = new sap.ui.model.json.JSONModel({
                    dataitems: []
                });
                oJSONModel.setSizeLimit(999);
                this.getView().byId("attachmentServiceFileUpload").setModel(oJSONModel, "__attachmentData");
                this.getView().byId("attachmentServiceFileUploadLFH").setModel(oJSONModel, "__attachmentData");
                //largeFileHandling determination

                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    "largeFileHandlingEnabled": false,
                    "changeEnabled": false
                }), "__attachmentModel");

                /***************************************************
                 ****************************************************/
                this.getView().byId("attachmentServiceFileUpload").addEventDelegate({
                    onBeforeRendering: function() {
                        this.getView().byId("attachmentTitle").setText(this._showAttachmentsNumber());
                        this.getView().byId("attachmentServiceFileUpload").setUploadButtonInvisible(!this._fieldControl._VisibleActions.ADD);
                        this.getView().byId("AddUrl").setVisible(this._fieldControl._VisibleActions.ADDURL);
                        this.getOwnerComponent().setAttachmentCount(this.getView().byId("attachmentServiceFileUpload").getItems().length);
                        this.byId("Download").setVisible(this._fieldControl._VisibleActions.DOWNLOAD);
                    }.bind(this)
                });

                var that = this;
                this.mGroupFunctions = {
                    uploadedBy: function(oContext) {
                        return {
                            key: oContext.getProperty("attributes")[0].text, //'uploadedBy' value as attribute
                            text: "Uploaded By"
                        };
                    },
                    content_type: function(oContext) {
                        return {
                            key: oContext.getProperty("content_type"), //'mimeType' value as property
                            text: "Mime Type"
                        };
                    },
                    status: function(oContext) {
                        return {
                            key: oContext.getProperty("status"),
                            text: "Status"
                        };
                    },
                    Documenttype: function(oContext) {
                        return {
                            key: oContext.getProperty("Documenttype"), //'version' value as attribute
                            text: "Document type"
                        };
                    }
                };
            },

            getURLForService: function() {
                var systemAlias = sap.ushell.Container.getService("AppLifeCycle").getCurrentApplication().componentInstance.getComponentData().startupParameters[
                    "sap-system"];
                if (systemAlias !== undefined) {
                    systemAlias = sap.ushell.Container.getService("AppLifeCycle").getCurrentApplication().componentInstance.getComponentData().startupParameters[
                        "sap-system"][0];
                }
                return (sap.ui.model.odata.ODataUtils.setOrigin("/sap/opu/odata/sap/CV_ATTACHMENT_SRV", systemAlias));
            },

            getAttributeList: function() {
                var attrList = this._fieldControl;
                return attrList;
            },
            getUploadCollectionControl: function() {
                var isLFHActive = this.getView().getModel("__attachmentModel").getData().largeFileHandlingEnabled;
                if (isLFHActive) {
                    return this.getView().byId("attachmentServiceFileUploadLFH");
                } else {
                    return this.getView().byId("attachmentServiceFileUpload");
                }
            },

            flavorControl: function(flavor) {
                if (flavor && flavor === "withCheckIn") {
                    this.getView().byId("CheckInButton").setVisible(true);
                    this.getView().byId("CheckOutButton").setVisible(true);
                    this.getView().byId("ResetCheckOutButton").setVisible(true);
                    this.checkedInStatusShow = true;
                    var oUploadCollection = this.getUploadCollectionControl();
                    var attachmentItems = oUploadCollection.getItems();
                    attachmentItems.forEach(function(oItem) {
                        oItem.setSelected(false);
                    });
                    oUploadCollection.setMode("MultiSelect");
                    this.getView().byId("DocTypeSelect").setVisible(false);
                    this.getView().byId("assignDIR").setVisible(false);
                    this.getView().byId("unassignDIR").setVisible(false);
                    this.getView().byId("viewSettings").setVisible(false);

                } else if (flavor && flavor === "withDocType") {
                    this.getView().byId("CheckInButton").setVisible(true);
                    this.getView().byId("CheckOutButton").setVisible(true);
                    this.getView().byId("ResetCheckOutButton").setVisible(true);
                    this.checkedInStatusShow = true;
                    var oUploadCollection = this.getUploadCollectionControl();
                    var attachmentItems = oUploadCollection.getItems();
                    attachmentItems.forEach(function(oItem) {
                        oItem.setSelected(false);
                    });
                    oUploadCollection.setMode("MultiSelect");
                    this.getView().byId("DocTypeSelect").setVisible(true);
                    this.getView().byId("assignDIR").setVisible(true);
                    this.getView().byId("unassignDIR").setVisible(true);
                    this.getView().byId("viewSettings").setVisible(true);

                } else {
                    this.getView().byId("CheckInButton").setVisible(false);
                    this.getView().byId("CheckOutButton").setVisible(false);
                    this.getView().byId("ResetCheckOutButton").setVisible(false);
                    this.getView().byId("DocTypeSelect").setVisible(false);
                    this.getView().byId("assignDIR").setVisible(false);
                    this.getView().byId("unassignDIR").setVisible(false);
                    this.getView().byId("viewSettings").setVisible(false);
                    this.getUploadCollectionControl().setMode("None");
                }
            },

            setAttributes: function(attr) {
                if (attr._VisibleAttributes) {
                    this._fieldControl._VisibleAttributes.UPLOADEDBY = (attr._VisibleAttributes.UPLOADEDBY !== undefined ? attr._VisibleAttributes.UPLOADEDBY :
                        this._fieldControl
                        ._VisibleAttributes.UPLOADEDBY);
                    this._fieldControl._VisibleAttributes.UPLOADEDON = (attr._VisibleAttributes.UPLOADEDON !== undefined ? attr._VisibleAttributes.UPLOADEDON :
                        this._fieldControl
                        ._VisibleAttributes.UPLOADEDON);
                    this._fieldControl._VisibleAttributes.FILESIZE = (attr._VisibleAttributes.FILESIZE !== undefined ? attr._VisibleAttributes.FILESIZE :
                        this._fieldControl
                        ._VisibleAttributes.FILESIZE);
                    this._fieldControl._VisibleAttributes.ENABLELINK = (attr._VisibleAttributes.ENABLELINK !== undefined ? attr._VisibleAttributes.ENABLELINK :
                        this._fieldControl
                        ._VisibleAttributes.ENABLELINK);
                    this._fieldControl._VisibleAttributes.ATTACHMENTSTATUS = (attr._VisibleAttributes.ATTACHMENTSTATUS !== undefined ? attr._VisibleAttributes
                        .ATTACHMENTSTATUS :
                        this._fieldControl._VisibleAttributes.ATTACHMENTSTATUS);
                    this._fieldControl._VisibleAttributes.ATTACHMENTTITLE = (attr._VisibleAttributes.ATTACHMENTTITLE !== undefined ? attr._VisibleAttributes
                        .ATTACHMENTTITLE :
                        this._fieldControl._VisibleAttributes.ATTACHMENTTITLE);
                    this._fieldControl._VisibleAttributes.SOURCE = (attr._VisibleAttributes.SOURCE !== undefined ? attr._VisibleAttributes.SOURCE :
                        this._fieldControl
                        ._VisibleAttributes.SOURCE);
                    this._fieldControl._VisibleAttributes.DIRDETAILS = (attr._VisibleAttributes.DIRDETAILS !== undefined ? attr._VisibleAttributes.DIRDETAILS :
                        this._fieldControl
                        ._VisibleAttributes.DIRDETAILS);
                } else {
                    this._fieldControl._VisibleAttributes.UPLOADEDBY = this._fieldControl._VisibleAttributes.UPLOADEDBY;
                    this._fieldControl._VisibleAttributes.UPLOADEDON = this._fieldControl._VisibleAttributes.UPLOADEDON;
                    this._fieldControl._VisibleAttributes.FILESIZE = this._fieldControl._VisibleAttributes.FILESIZE;
                    this._fieldControl._VisibleAttributes.ENABLELINK = this._fieldControl._VisibleAttributes.ENABLELINK;
                    this._fieldControl._VisibleAttributes.ATTACHMENTSTATUS = this._fieldControl._VisibleAttributes.ATTACHMENTSTATUS;
                    this._fieldControl._VisibleAttributes.ATTACHMENTTITLE = this._fieldControl._VisibleAttributes.ATTACHMENTTITLE;
                    this._fieldControl._VisibleAttributes.SOURCE = this._fieldControl._VisibleAttributes.SOURCE;
                    this._fieldControl._VisibleAttributes.DIRDETAILS = this._fieldControl._VisibleAttributes.DIRDETAILS;
                }
                if (attr._VisibleActions) {
                    this._properties.visibleEdit = this._fieldControl._VisibleActions.RENAME = (attr._VisibleActions.RENAME !== undefined ? attr._VisibleActions
                        .RENAME :
                        this._fieldControl._VisibleActions.RENAME);
                    this._properties.visibleDelete = this._fieldControl._VisibleActions.DELETE = (attr._VisibleActions.DELETE !== undefined ? attr._VisibleActions
                        .DELETE :
                        this._fieldControl._VisibleActions.DELETE);
                    this._fieldControl._VisibleActions.ADD = (attr._VisibleActions.ADD !== undefined ? attr._VisibleActions.ADD : this._fieldControl._VisibleActions
                        .ADD);
                    this._fieldControl._VisibleActions.ADDURL = (attr._VisibleActions.ADDURL !== undefined ? attr._VisibleActions.ADDURL : this._fieldControl
                        ._VisibleActions
                        .ADDURL);
                    this._fieldControl._VisibleActions.DOWNLOAD = (attr._VisibleActions.DOWNLOAD !== undefined ? attr._VisibleActions.DOWNLOAD : this._fieldControl
                        ._VisibleActions.DOWNLOAD);
                } else {
                    this._properties.visibleEdit = this._fieldControl._VisibleActions.RENAME;
                    this._properties.visibleDelete = this._fieldControl._VisibleActions.DELETE;
                    this._fieldControl._VisibleActions.ADD = this._fieldControl._VisibleActions.ADDURL;
                    this._fieldControl._VisibleActions.ADDURL = this._fieldControl._VisibleActions.ADDURL;
                    this._fieldControl._VisibleActions.DOWNLOAD = this._fieldControl._VisibleActions.DOWNLOAD;
                }
            },
            /***************************************************************************
             * Backend Related Methods
             **************************************************************************/
            _backendCall: function(action, oContext) {
                switch (action) {
                    case this._ACTION.DELETEATTACHMENT:
                        return this._onDeleteAttachment(this, oContext);
                    case this._ACTION.LISTATTACHMENT:
                        return this._retrieveAttachment(this, oContext);
                    case this._ACTION.RENAMEATTACHMENT:
                        return this._onRenameAttachment(this, oContext);
                    case this._ACTION.COUNTATTACHMENT:
                        return this._getAttachmentsCount(this, oContext);
                    case this._ACTION.SAVEATTACHMENT:
                        return this._commitChange(this, oContext);
                    case this._ACTION.CANCELATTACHMENT:
                        return this._cancelChange(this, oContext);
                    case this._ACTION.DRAFTATTACHMENT:
                        return this._getApplicationStatus(this, oContext);
                    case this._ACTION.CREATEURL:
                        return this._onCreateUrlAsAttachment(this, oContext);
                }
            },
            //"objectkey": btoa(encodeURIComponent(self._properties.objectKey)),
            _onDeleteAttachment: function(self, item) {
                if (!self.oModel) {
                    self.oModel = new sap.ui.model.odata.v2.ODataModel(this._serviceUrl, {
                        defaultBindingMode: "TwoWay"
                    });
                }
                var uri = "/OriginalContentSet(" + self._prepareUrlParameters(self._ACTION.DELETEATTACHMENT, item) + ")";
                self.oModel.remove(uri, {
                    headers: {
                        "objectkey": self._properties.objectKey,
                        "objecttype": self._properties.objectType,
                        "semanticobjecttype": self._properties.semanticObject,
                        markfordeletion: true
                    },
                    success: function() {
                        self._deleteFileHandler(item, true);
                        self.commitChanges(true);
                    },
                    error: function(oError) {
                        self._deleteFileHandler(item, false);
                        self._showErrorMessage(JSON.parse(oError.responseText).error.message.value, "");
                    }
                });
            },
            _deleteFileHandler: function(item, isSuccess) {
                var oSelf = this;
                var oData = oSelf.byId("attachmentServiceFileUpload").getModel("__attachmentData").getData();
                var aItems = oData.dataitems;
                if (isSuccess) {
                    jQuery.each(aItems, function(index) {
                        if (aItems[index] && aItems[index] === item)
                            aItems.splice(index, 1);
                        oSelf._setAttachmentModel(aItems);
                    });
                    oSelf.oResult.status = "DELETED";
                    oSelf.getOwnerComponent().fireOndelete(oSelf.oResult);
                } else {
                    oSelf.oResult.status = "DELETEFAILED";
                    oSelf.getOwnerComponent().fireOndelete(oSelf.oResult);
                }
            },
            _retrieveAttachment: function(self, withDocType) {
                var isRetrived = false;
                //var batchChanges = [];
                var results = [];
                if (!this.oModel) {
                    this.oModel = new sap.ui.model.odata.v2.ODataModel(this._serviceUrl, {
                        defaultBindingMode: "TwoWay"
                    });
                }
                self.oModel.refresh(true);
                //if (this.getOwnerComponent().getFlavor() === "withDocType" && this._properties.mode !== "D") {
                if (this.getOwnerComponent().getFlavor() === "withDocType") {
                    self.oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/CV_ATTACHMENT_SRV");
                    var oJSONModel = new sap.ui.model.json.JSONModel({
                        dataitems: []
                    });
                    self.oModel.read(
                        "/I_DocInfoRecdObjTypeToDocType", {
                            context: "",
                            filters: [
                                new sap.ui.model.Filter({
                                    path: "LinkedSAPObject",
                                    operator: "EQ",
                                    value1: this._properties.objectType
                                })
                            ],
                            success: function(oData, response) {
                                self.getView().byId("DocTypeSelect").setModel(oJSONModel, "__DocType");
                                oData.results.unshift({
                                    "DocumentInfoRecordDocType_Text": "",
                                    "DocumentInfoRecordDocType": ""
                                });
                                self.getView().byId("DocTypeSelect").getModel("__DocType").setData({
                                    "dataItems": oData.results
                                });
                                if (oData.results[1]) {
                                    self._properties.documentType = oData.results[1].DocumentInfoRecordDocType;
                                }
                                if (oData.results.length > 2) {
                                    self.byId("DocTypeSelect").setVisible(true);
                                } else {
                                    self.byId("DocTypeSelect").setVisible(false);
                                }
                            },
                            error: function(oError) {
                                self._showErrorMessage(JSON.parse(oError.responseText).error.message.value, "");
                            }
                        });
                }
                self.oModel.callFunction("/GetAllOriginals", {
                    method: "GET",
                    urlParameters: {
                        ObjectType: this._properties.objectType ? this._properties.objectType : "",
                        ObjectKey: this._properties.objectKey ? this._properties.objectKey : "",
                        SemanticObjectType: this._properties.semanticObject ? this._properties.semanticObject : "",
                        IsDraft: self.getOwnerComponent().getIsDraft()
                    },
                    success: function(oData, resp) {
                        results = results.concat(oData.results);
                        self.oResponse = results;
                        isRetrived = true;
                        self._setOriginal({
                            results: results
                        });
                        if (results && results.length !== 0) {
                            if (results[0].UxFCAdd === 0) {
                                self.getUploadCollectionControl().setUploadEnabled(false);
                            }
                        }
                        //self.getView().setModel(self.getView().byId("attachmentServiceFileUpload").getModel("__attachmentData"));
                    },
                    error: function(oError) {
                        self._showErrorMessage(JSON.parse(oError.responseText).error.message.value, "");
                    }
                });
                self.oModel.callFunction("/GetArchiveLinkAttachments", {
                    method: "GET",
                    urlParameters: {
                        ArchiveObjectID: this._properties.objectKey ? this._properties.objectKey : "",
                        ArchiveObjectType: this._properties.objectType ? this._properties.objectType : "",
                        SemanticObjectType: this._properties.semanticObject ? this._properties.semanticObject : "",
                    },
                    success: function(oData, resp) {
                        results = results.concat(oData.results);
                        self.oResponse = results;
                        isRetrived = true;
                        self._setOriginal({
                            results: results
                        });
                        if (results && results.length !== 0) {
                            if (results[0].UxFCAdd === 0) {
                                self.getUploadCollectionControl().setUploadEnabled(false);
                            }
                        }
                    },
                    error: function(oError) {
                        self._showErrorMessage(JSON.parse(oError.responseText).error.message.value, "");
                    }
                });
                return isRetrived;

            },
            _removeFileFromList: function(filename) {
                var oUploadCollection = this.getUploadCollectionControl();
                for (var i = 0; i < oUploadCollection.getItems().length; i++) {
                    if (oUploadCollection.getItems()[i].getFileName() === filename) {
                        oUploadCollection.removeItem(oUploadCollection.getItems()[i]);
                        break;
                    }
                }
            },
            convertJSONtoXML: function(json, tab) {
                var toXml = function(v, name, ind) {
                        var xml = "";
                        if (v instanceof Array) {
                            for (var i = 0, n = v.length; i < n; i++) {
                                xml += ind + toXml(v[i], name, ind + "\t") + "\n";
                            }
                        } else if (typeof(v) === "object") {
                            var hasChild = false;
                            xml += ind + "<" + name;
                            for (var m in v) {
                                if (m.charAt(0) === "@") {
                                    xml += " " + m.substr(1) + "=\"" + v[m].toString() + "\"";
                                } else {
                                    hasChild = true;
                                }
                            }
                            xml += hasChild ? ">" : "/>";
                            if (hasChild) {
                                for (var m in v) {
                                    if (m === "#text") {
                                        xml += v[m];
                                    } else if (m === "#cdata") {
                                        xml += "<![CDATA[" + v[m] + "]]>";
                                    } else if (m.charAt(0) !== "@") {
                                        xml += toXml(v[m], m, ind + "\t");
                                    }
                                }
                                xml += (xml.charAt(xml.length - 1) === "\n" ? ind : "") + "</" + name + ">";
                            }
                        } else {
                            xml += ind + "<" + name + ">" + v.toString() + "</" + name + ">";
                        }
                        return xml;
                    },
                    xml = "";
                for (var m in json) {
                    xml += toXml(json[m], m, "");
                }
                return tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, "");
            },
            uploadFiles: function(oUploaderModel, callBack) {
                var that = this;
                this._properties.objectKey = oUploaderModel.objectKey;
                this._properties.objectType = oUploaderModel.objectType;
                try {
                    if (oUploaderModel.checkingIn && oUploaderModel.checkingIn === true) {
                        this._handleUpload(oUploaderModel, {}, callBack);
                    } else if (oUploaderModel.createDIR === true) {
                        var dirData = {};
                        if (oUploaderModel.checkingInAsNewVersion === true) {
                            dirData.DocumentInfoRecordDocType = oUploaderModel.DIRKeys.DocumentInfoRecordDocType;
                            dirData.DocumentInfoRecordDocNumber = oUploaderModel.DIRKeys.DocumentInfoRecordDocNumber;
                            dirData.DocumentInfoRecordDocPart = oUploaderModel.DIRKeys.DocumentInfoRecordDocPart;
                            dirData.DocumentInfoRecordDocVersion = oUploaderModel.DIRKeys.DocumentInfoRecordDocVersion;
                        }
                        dirData.DocumentDescription = oUploaderModel.files[0].name.substring(0, 40);
                        var objLinkData = {
                            "LinkedSAPObject": oUploaderModel.objectType,
                            "LinkedSAPObjectKey": oUploaderModel.objectKey
                        };
                        var tempmodel = new sap.ui.model.odata.v2.ODataModel(this._serviceUrl, true);

                        tempmodel.create("/DocumentHeaderDraftSet", dirData, {
                            success: function(oData) {
                                that._handleUpload(oUploaderModel, oData, callBack);

                            },
                            error: function(e) {
                                return (that._showErrorMessage(JSON.parse(e.response.body).error.message.value, ""));
                            }
                        });
                        tempmodel.create("/ObjectLinkDraftSet", objLinkData);
                    }
                } catch (error) {
                    jQuery.sap.log.error(error);
                }
            },
            _handleUpload: function(oUploaderModel, oData, callBack) {
                var objUUID, self = this;
                if (oData && oData.DraftUUID) {
                    objUUID = oData.DraftUUID.replace(/\-/g, "");
                } else {
                    objUUID = oUploaderModel.objectKey;
                }
                //var oFileUploader;
                if (!this.oFileUploader) {
                    this.oFileUploader = new sap.ui.unified.FileUploader({
                        useMultipart: false,
                        uploadComplete: function(oEvent) {
                            try {
                                var file = oEvent.getParameters();
                                var msgTxt = "";
                                self.oResult = {};
                                var oResponse = $.parseJSON(file.responseRaw).d;
                                self.oResult.fileName = file.fileName;
                                if (file.status === 200 || file.status === 201) {
                                    self.oResult.status = "UPLOADSUCCESS";
                                    self.getOwnerComponent().fireOnupload(self.oResult);
                                    var oResponse = $.parseJSON(file.responseRaw).d;
                                    self.oResult.fileId = oResponse.FileId;
                                    self.oResult.applicationId = oResponse.ApplicationId;
                                } else {
                                    msgTxt = msgTxt + file.fileName + ": " + $.parseJSON(file.responseRaw).error.innererror.errordetails[0].message +
                                        "\n";
                                    self.oResult.status = "UPLOADFAILURE";
                                    self.getOwnerComponent().fireOnupload(self.oResult);
                                }

                                if (msgTxt) {
                                    self._showErrorMessage(self.getView().getModel("i18n").getResourceBundle().getText("MESSAGE_UPLOAD_FAILED"), msgTxt);
                                }
                                if (oUploaderModel.isDraft === false) {
                                    self._commitChanges(false);
                                }
                                if (callBack) {
                                    callBack(oResponse);
                                }
                            } catch (error) {
                                jQuery.sap.log.error(error);
                                msgTxt = self.getView().getModel("i18n").getResourceBundle().getText("MESSAGE_UPLOAD_FAILED");
                                self.oResult.status = "UPLOADFAILURE";
                                self.getOwnerComponent().fireOnupload(self.oResult);

                            }
                        }
                    });
                }
                for (var i = 0; i < oUploaderModel.files.length; i++) {
                    this.oFileUploader.destroyHeaderParameters();
                    this.oFileUploader.setUploadUrl(this._serviceUrl + "/OriginalContentSet");
                    self.addFileUploaderParameter("objectkey", btoa(encodeURIComponent(objUUID)), this.oFileUploader);
                    self.addFileUploaderParameter("objecttype", "DRAW", this.oFileUploader);
                    self.addFileUploaderParameter("semanticobjecttype", oUploaderModel.semanticObjectType, this.oFileUploader);
                    self.addFileUploaderParameter("documentType", "", this.oFileUploader);
                    self.addFileUploaderParameter("documentNumber", "", this.oFileUploader);
                    self.addFileUploaderParameter("documentVersion", "", this.oFileUploader);
                    self.addFileUploaderParameter("documentPart", "", this.oFileUploader);
                    self.addFileUploaderParameter("Accept", "application/json", this.oFileUploader);
                    self.addFileUploaderParameter("slug", btoa(encodeURIComponent(oUploaderModel.files[i].name)), this.oFileUploader);
                    self.addFileUploaderParameter("customStuff", 'customDatas', this.oFileUploader);
                    self.addFileUploaderParameter("x-csrf-token", self._getToken(), this.oFileUploader);
                    if (oUploaderModel.checkingIn === true) {
                        self.addFileUploaderParameter("ApplicationId", oUploaderModel.ApplicationId, this.oFileUploader);
                        self.addFileUploaderParameter("FileID", oUploaderModel.FileId, this.oFileUploader);
                        self.addFileUploaderParameter("CheckIn", "X", this.oFileUploader);
                        self.addFileUploaderParameter("CheckInAsNewVersion", "", this.oFileUploader);

                    }
                    // oFileUploader.upload();
                    this.oFileUploader.fireChange({
                        files: [oUploaderModel.files[i]]
                    });
                    this.oFileUploader._sendFilesFromDragAndDrop([oUploaderModel.files[i]]);
                }

            },

            addFileUploaderParameter: function(key, value, oFileUploader) {
                var oHeaderParameter = new sap.ui.unified.FileUploaderParameter({
                    name: key,
                    value: value
                });
                oFileUploader.addHeaderParameter(oHeaderParameter);
                return oHeaderParameter;

            },
            onDownloadAll: function(attachmentList, callBack, suppressLogDownload) {
                var self = this;
                var modIndex;
                var batchChanges = [];
                var returnList = {
                    "FileList": []
                };
                var FileInfoJSON;
                jQuery.each(attachmentList.objectKeyList, function(index) {
                    var oK = "ObjectKey='" + encodeURIComponent(attachmentList.objectKeyList[index].objectKey) + "'";
                    var oT = "ObjectType='" + encodeURIComponent(attachmentList.objectKeyList[index].objectType) + "'";
                    var aK = "ArchiveObjectID='" + encodeURIComponent(attachmentList.objectKeyList[index].objectKey) + "'";
                    var aT = "ArchiveObjectType='" + encodeURIComponent(attachmentList.objectKeyList[index].objectType) + "'";
                    var oS = "SemanticObjectType='" + "" + "'";

                    var encodeURL = (oK + "&" + oT + "&" + oS);
                    var encodeARC = (aK + "&" + aT + "&" + oS);

                    batchChanges.push(self._objects.oModel.createBatchOperation("/GetAllOriginals?" + encodeURL, "GET"));
                    batchChanges.push(self._objects.oModel.createBatchOperation("/GetArchiveLinkAttachments?" + encodeARC, "GET"));
                });

                self._objects.oModel.addBatchReadOperations(batchChanges);
                self._objects.oModel.submitBatch(function(oData) {
                    var results = [];
                    oData.__batchResponses.forEach(function(resp, index) {
                        if (resp.response) {
                            self._showErrorMessage(JSON.parse(resp.response.body).error.message.value, "");
                        } else {
                            results = results.concat(resp.data.results);

                            for (var i = 0; i < resp.data.results.length; i++) {
                                if (!resp.data.results[i].ContentSource) {
                                    modIndex = parseInt(index / 2);
                                    FileInfoJSON = {
                                        "objectType": attachmentList.objectKeyList[modIndex].objectType,
                                        "objectKey": attachmentList.objectKeyList[modIndex].objectKey,
                                        "FileName": results[i].Filename,
                                        "success": true,
                                        "messageText": "",
                                        "url": self._changeHostname(results[i].__metadata.media_src)
                                    };
                                    returnList.FileList.push(FileInfoJSON);

                                }
                            }
                        }
                    });
                    var promiseArray = [];
                    if (results.length !== 0) {
                        for (var i = 0; i < results.length; i++) {
                            if (!results[i].ContentSource) {
                                var download = self._changeHostname(results[i].__metadata.media_src);
                                promiseArray.push(self._downloadFilePromise(download, results[i].Filename, results[i].ContentType));
                            }
                        }
                    }
                    Promise.all(promiseArray).then(function(resolveValues) {
                        for (i = 0; i < returnList.FileList.length; i++) {
                            returnList.FileList[i].success = resolveValues[i];
                        }
                        callBack(returnList);
                        if (!suppressLogDownload) {
                            sap.ui.core.util.File.save(self.convertJSONtoXML(returnList), "log-" + Date(), "xml", "application/xml", 'utf-8');
                        }
                    });
                });

            },
            _downloadFilePromise: function(downloadURL, sFileName, sMimeType, sToken) {
                // XHR Request
                return new Promise(function(resolve, reject) {
                    var oBlob = null;
                    var returnStatus;
                    var xhttp = new window.XMLHttpRequest();
                    xhttp.open("GET", downloadURL, true);
                    if (sToken && sToken.value) {
                        var setRequestHeader = xhttp.setRequestHeader;
                        // Replace with a wrapper
                        xhttp.setRequestHeader = function(name, value) {
                            // Ignore the X-Requested-With header
                            if (name === 'X-XHR-Logon' || name === 'X-Requested-With') {
                                return;
                            }
                            // Otherwise call the native setRequestHeader method
                            // Note: setRequestHeader requires its 'this' to be the xhr object,
                            // which is what 'this' is here when executed.
                            setRequestHeader.call(this, name, value);
                        };
                        xhttp.setRequestHeader(sToken.key, sToken.value);
                    }
                    xhttp.responseType = "blob";
                    xhttp.onload = function() {
                        var oExtension = sFileName.substr(sFileName.lastIndexOf('.') + 1);
                        var oFileName = sFileName.substr(0, sFileName.lastIndexOf('.'));
                        oBlob = xhttp.response;
                        if (xhttp.status !== 400) {
                            sap.ui.core.util.File.save(oBlob, oFileName, oExtension, sMimeType, 'utf-8');
                            returnStatus = true;
                        } else {
                            returnStatus = false;
                        }
                        resolve(returnStatus, xhttp.response);

                    };
                    xhttp.send();
                });
            },
            downloadviaURL: function(downloadURL, sFileName, sMimeType) {
                // var link = document.getElementById("ecm-download-href");
                // if (!link) {
                // 	link = document.createElement("a");
                // }
                // link.href = downloadURL;
                // link.target = "_blank";
                // document.body.appendChild(link);
                // link.click();
                // document.body.removeChild(link);
                sap.m.URLHelper.redirect(downloadURL, true);
            },

            _onDownloadAllAttach: function(oEvent) {
                var oUploadCollection = this.getView().byId("attachmentServiceFileUpload");
                var aSelectedItems = oUploadCollection.getSelectedItems();
                if (aSelectedItems.length !== 0) {
                    for (var i = 0; i < aSelectedItems.length; i++) {
                        if (aSelectedItems[i].getMimeType !== "text/url") {
                            oUploadCollection.downloadItem(aSelectedItems[i], true);
                        }
                    }
                } else {
                    oUploadCollection.selectAll();
                    aSelectedItems = oUploadCollection.getItems();
                    if (aSelectedItems.length !== 0) {
                        for (i = 0; i < aSelectedItems.length; i++) {
                            if (aSelectedItems[i].getMimeType !== "text/url") {
                                oUploadCollection.downloadItem(aSelectedItems[i], true);
                            }
                        }
                    } else {
                        this._showErrorMessage(this.getView().getModel("i18n").getResourceBundle().getText("MESSAGE_DOWNLOAD_FAILED"), "");
                    }
                }
            },

            _onRenameAttachment: function(self, item) {
                var oResponse = false;
                var responseData = {};
                self._objects.oModel.create("/RenameAttachment?" + self._prepareUrlParameters(self._ACTION.RENAMEATTACHMENT, item), null, null,
                    function(oData) {
                        oResponse = oData;
                        responseData.Filename = oData.Filename;
                        responseData.FileId = oData.FileId;
                        responseData.ApplicationId = oData.ApplicationId;
                        responseData.Status = "Success";
                        self.getOwnerComponent().fireOnrename(responseData);
                    },
                    function(e) {
                        self._showErrorMessage(JSON.parse(e.response.body).error.message.value, "");
                        responseData.Status = "Failed";
                        self.getOwnerComponent().fireOnrename(responseData);
                    });

                return oResponse;
            },
            _getAttachmentsCount: function(oSelf, oContext) {
                var oResult;
                oSelf._objects.oModel.read("/GetAttachmentCount", null, oSelf._prepareUrlParameters(oSelf._ACTION.COUNTATTACHMENT, null), false,
                    function(oData, oResponse) {
                        //oResult = JSON.parse(oResponse.body).d.GetAttachmentCount;
                        oResult = oData.GetAttachmentCount;
                    },
                    function(e) {
                        oSelf._showErrorMessage(JSON.parse(e.response.body).error.message.value, "");
                    }
                );
                return oResult;
            },
            _onCreateUrlAsAttachment: function(self, item) {
                var oResponse = false;
                self.oResult.fileName = sap.ui.getCore().byId("URL").getValue();
                self._objects.oModel.create("/CreateUrlAsAttachment?" + self._prepareParametersToCreateUrl(self._ACTION.CREATEURL), null, null,
                    function(oData) {
                        oResponse = true;
                        var data1 = self.byId("attachmentServiceFileUpload").getModel("__attachmentData").getData();
                        data1.dataitems.unshift(self._mapResult(oData));
                        self._setAttachmentModel(data1.dataitems);
                        self.oResult.status = "UPLOADCOMPLETED";
                        self.getOwnerComponent().fireOnupload(self.oResult);
                    },
                    function(e) {
                        self._showErrorMessage(JSON.parse(e.response.body).error.innererror.errordetails[0].message, "");
                        self.oResult.status = "UPLOADFAILED";
                        self.getOwnerComponent().fireOnupload(self.oResult);
                    });
                return oResponse;
            },
            _commitChange: function(oSelf, oContext) {
                var oResult = {
                    isSaved: false,
                    isRetrieved: false,
                    isCanceled: false,
                    msgDetail: {},
                    innerErrorDetails: []
                };
                var oResponse;
                oSelf._objects.oModel.create("/ConfirmAttachment?" + oSelf._prepareUrlParameters(oSelf._ACTION.SAVEATTACHMENT, null), null, null,
                    function(e, r) {
                        oResult.isSaved = e.ConfirmAttachment.Success;
                        oResponse = r.headers["sap-message"];
                    },
                    function(e) {
                        oResponse = e.response.body;
                    });
                if (oResponse) {
                    oResponse = oSelf._prepareResponse(oResponse);
                    oResult.msgDetail = oResponse.msgDetail;
                    oResult.innerErrorDetails = oResponse.innerErrorDetails;
                }
                return oResult;
            },
            _cancelChange: function(oSelf, oContext) {
                var oResult = {
                    isSaved: false,
                    isRetrieved: false,
                    isCanceled: false,
                    msgDetail: {},
                    innerErrorDetails: []
                };
                oSelf._objects.oModel.create("/CancelAttachment?" + oSelf._prepareUrlParameters(oSelf._ACTION.CANCELATTACHMENT, null), null, null,
                    function() {
                        oResult.isCanceled = true;
                    },
                    function(e) {
                        var oResponse = oSelf._prepareResponse(e.response.body);
                        oResult.msgDetail = oResponse.msgDetail;
                        oResult.innerErrorDetails = oResponse.innerErrorDetails;
                    });
                return oResult;
            },
            _getApplicationStatus: function(oSelf, oContext) {
                var oResult;
                oSelf._objects.oModel.read("/GetApplicationState", null, oSelf._prepareUrlParameters(this._ACTION.DRAFTATTACHMENT, null), false,
                    function(oData, oResponse) {
                        //oResult = JSON.parse(oResponse.body).d.GetApplicationState.IsDirty;
                        oResult = oData.GetApplicationState.IsDirty;
                    },
                    function(e) {
                        oSelf._showErrorMessage(JSON.parse(e.response.body).error.message.value, "");
                    });
                return oResult;
            },
            _getToken: function() {
                var sToken = "",
                    oControl = this;
                this._objects.oModel.refreshSecurityToken(function(e, o) {
                    sToken = oControl._objects.oModel.getSecurityToken();
                }, function(e) {
                    oControl._showErrorMessage($(e.response.body).find("message").first().text(), "");
                }, false);
                return sToken;
            },
            /***************************************************************************
             * Methods calling Backend
             **************************************************************************/
            _commitChanges: function(isRefresh) {
                var oResponse = this._backendCall(this._ACTION.SAVEATTACHMENT, null);
                if (oResponse.isSaved) {
                    if (isRefresh) {
                        var oResult = this._backendCall(this._ACTION.LISTATTACHMENT, null);
                        oResponse.isRetrieved = oResult;
                    }
                }
                return oResponse;
            },
            _cancelChanges: function(isRefresh) {
                var oResponse = this._backendCall(this._ACTION.CANCELATTACHMENT, null);
                if (oResponse.isCanceled) {
                    if (isRefresh) {
                        var oResult = this._backendCall(this._ACTION.LISTATTACHMENT, null);
                        oResponse.isRetrieved = oResult;
                    }
                }
                return oResponse;
            },
            _getApplicationState: function() {
                var oResponse = this._backendCall(this._ACTION.DRAFTATTACHMENT, null);
                return oResponse;
            },
            _getOriginal: function() {
                this._setProperty();
                this._backendCall(this._ACTION.LISTATTACHMENT);
            },
            _getAttachmentCount: function() {
                var attachmentCount = {
                    totalAttachmentCount: 0,
                    confirmedAttachmentCount: 0,
                    unconfirmedAttachmentCount: 0
                };
                var oResponse = this._backendCall(this._ACTION.COUNTATTACHMENT, null);
                if (oResponse) {
                    attachmentCount.totalAttachmentCount = oResponse.TotalCount;
                    attachmentCount.confirmedAttachmentCount = oResponse.ConfirmedCount;
                    attachmentCount.unconfirmedAttachmentCount = oResponse.UnconfirmedCount;
                }
                return attachmentCount;
            },
            /***************************************************************************
             * Upload Collection Event
             **************************************************************************/
            _pressLink: function(event) {
                var _url = event.getSource().getUrl();
                var fileId = event.getSource().getDocumentId();
                var mimeType = event.getSource().getMimeType();
                var fileName = event.getSource().getFileName();
                var featureToggle = this.getView().getModel("__attachmentModel").getData().largeFileHandlingEnabled;

                function fnCallbackMessageBox(sResult) {
                    if (sResult === MessageBox.Action.OK) {
                        sap.m.URLHelper.redirect(_url, true);
                    }
                }
                if (event.getSource().getMimeType() === "text/url") {
                    var aalt = MessageBox.confirm(
                        this.getView().getModel("i18n").getResourceBundle().getText("URL_Prompt_ask"),
                        fnCallbackMessageBox
                    );
                } else {
                    if (featureToggle === true) {
                        LargeFileHandler.getFileFromUrl.call(this, fileId, fileName, mimeType, false);
                    } else {
                        sap.m.URLHelper.redirect(_url, true);
                    }
                }
            },
            _onUploadFile: function(oEvent) {
                try {
                    var oData = this.getView().byId("attachmentServiceFileUpload").getModel("__attachmentData").getData();
                    var files = oEvent.getParameters().files;
                    var msgTxt = '';
                    for (var i = 0; i < files.length; i++) {
                        this.oResult.fileName = files[i].fileName;
                        if (files[i].status === 200 || files[i].status === 201) {
                            this.uploadCountSuccess += 1;
                            var oResponse = $.parseJSON(files[i].responseRaw).d;
                            oResponse.CreatedAt = new Date(parseInt(oResponse.CreatedAt.substr(6)));
                            if (this.checkingIn || this.checkingInAsNewVersion) {
                                this._updateFile(oResponse);
                                this.checkingIn = false;
                                this.checkingInAsNewVersion = false;
                                this.fieldControlFileOperations("CheckIn");

                            } else {
                                oData.dataitems.unshift(this._mapResult(oResponse));
                                this._setAttachmentModel(oData.dataitems);
                            }
                            this.oResult.status = "UPLOADSUCCESS";
                            this.getOwnerComponent().fireOnupload(this.oResult);

                            var that = this;
                            var oModel = this.getView().getModel();

                            oModel.callFunction("/SaveAttachment", {
                                method: "POST",
                                urlParameters: {
                                    "ObjectKey": this._properties.objectKey
                                },
                                success: function(oData) {},
                                error: function(oResponse) {}
                            });
                        } else {

                            msgTxt = msgTxt + files[i].fileName + ": " + $.parseJSON(files[i].responseRaw).error.innererror.errordetails[0].message + "\n";
                            this.getView().byId("attachmentServiceFileUpload").getModel("__attachmentData").refresh(true);
                            this.uploadCountFailed += 1;
                            this.oResult.status = "UPLOADFAILURE";
                            this.getOwnerComponent().fireOnupload(this.oResult);
                            this.checkingIn = false;
                            this.checkingInAsNewVersion = false;

                        }
                    }
                    if (this.uploadCount === this.uploadCountSuccess + this.uploadCountFailed + this.uploadCountTerminated) {
                        this.oResult.status = "UPLOADCOMPLETED";
                        this.oResult.fileName = "";
                        this.getOwnerComponent().fireOnupload(this.oResult);

                    }
                    if (msgTxt) {
                        this._showErrorMessage(this.getView().getModel("i18n").getResourceBundle().getText("MESSAGE_UPLOAD_FAILED"), msgTxt);
                    }
                } catch (err) {
                    jQuery.sap.log.error(err);
                }

            },

            _onBeforeUploadStarts: function(oEvent) {
                var prop;
                var oUploadCollection = this.getUploadCollectionControl();
                this._setUploadCollectionHeader("objectkey", this._properties.objectKey, oEvent);
                //this._setUploadCollectionHeader("objectkey", encodeURIComponent(this._properties.objectKey), oEvent);
                this._setUploadCollectionHeader("objecttype", this._properties.objectType, oEvent);
                this._setUploadCollectionHeader("semanticobjecttype", this._properties.semanticObject, oEvent);
                this._setUploadCollectionHeader("documentType", this._properties.documentType, oEvent);
                this._setUploadCollectionHeader("documentNumber", this._properties.documentNumber, oEvent);
                this._setUploadCollectionHeader("documentVersion", this._properties.documentVersion, oEvent);
                this._setUploadCollectionHeader("documentPart", this._properties.documentPart, oEvent);
                this._setUploadCollectionHeader("Accept", "application/json", oEvent);
                this._setUploadCollectionHeader("slug", encodeURIComponent(oEvent.getParameters().fileName), oEvent);
                this._setUploadCollectionHeader("customStuff", 'customDatas', oEvent);
                if (this.checkingIn) {
                    prop = this._getSelectedItemProperties(this.itemforcheckingin, oUploadCollection);
                    this._setUploadCollectionHeader("ApplicationId", prop.ApplicationId, oEvent);
                    this._setUploadCollectionHeader("FileID", prop.FileId, oEvent);
                    this._setUploadCollectionHeader("CheckIn", "X", oEvent);
                    this._setUploadCollectionHeader("CheckInAsNewVersion", "", oEvent);
                } else if (this.checkingInAsNewVersion) {
                    prop = this._getSelectedItemProperties(this.itemforcheckingin, oUploadCollection);
                    this._setUploadCollectionHeader("ApplicationId", prop.ApplicationId, oEvent);
                    this._setUploadCollectionHeader("FileID", prop.FileId, oEvent);
                    this._setUploadCollectionHeader("CheckIn", "X", oEvent);
                    this._setUploadCollectionHeader("CheckInAsNewVersion", "X", oEvent);
                }

            },
            _onBeforeUploadFile: function(oEvent) {
                var isLFHActive = this.getView().getModel("__attachmentModel").getData().largeFileHandlingEnabled;
                if (isLFHActive) {
                    LargeFileHandler.handleChange.call(this, oEvent);
                } else {
                    this._handleChangeController.apply(this, [oEvent]);
                }
            },
            _handleChangeController: function(oEvent) {
                this.uploadCount += oEvent.getParameters().files.length;
                this.oResult.status = "UPLOADSTARTED";
                this.oResult.fileName = "";
                this.getOwnerComponent().fireOnupload(this.oResult);
                this.getView().byId('attachmentServiceFileUpload').getModel("__attachmentData").refresh(true);
                var oUploadCollection = oEvent.getSource();
                // Header Token
                var oCustomerHeaderToken = new sap.m.UploadCollectionParameter({
                    name: "x-csrf-token",
                    value: this._getToken()
                });
                oUploadCollection.addHeaderParameter(oCustomerHeaderToken);
                oUploadCollection.upload();
            },

            ShowUploadDialog: function() {
                var self = this;
                var dialog = new sap.m.Dialog({
                    title: self.getView().getModel("i18n").getResourceBundle().getText('Add_Links'),
                    type: "Message",
                    content: [
                        new sap.m.Label({
                            text: self.getView().getModel("i18n").getResourceBundle().getText('URL'),
                            labelFor: "URL",
                            required: true
                        }),
                        new sap.m.Input({

                            maxLength: 4000,
                            id: "URL",
                            type: "Url",
                            liveChange: function() {
                                if (self._checkUrl(this.getValue())) {
                                    this.setValueState(sap.ui.core.ValueState.Success);

                                } else {
                                    this.setValueState(sap.ui.core.ValueState.Error);
                                    this.setValueStateText(self.getView().getModel("i18n").getResourceBundle().getText('URL_Error_hint'));
                                }

                            }

                        }),
                        new sap.m.Label({
                            text: self.getView().getModel("i18n").getResourceBundle().getText('URL_Description_Text'),
                            labelFor: "URLDesc"
                        }),
                        new sap.m.Input({

                            maxLength: 40,
                            id: "URLDesc"
                        })
                    ],
                    beginButton: new sap.m.Button({
                        text: this.getView().getModel("i18n").getResourceBundle().getText('OK_Text'),
                        enabled: true,
                        press: function(oEvent) {
                            this.setEnabled(false);
                            if (sap.ui.getCore().byId("URL").getValue().length > 0) {
                                if (self._checkUrl(sap.ui.getCore().byId("URL").getValue())) {
                                    self._backendCall(self._ACTION.CREATEURL, null);
                                    dialog.close();
                                } else {
                                    self._showErrorMessage(self.getView().getModel("i18n").getResourceBundle().getText('URL_INVALID'));
                                    this.setEnabled(true);
                                }
                            } else {
                                self._showErrorMessage(self.getView().getModel("i18n").getResourceBundle().getText('URL_BLANK'));
                                this.setEnabled(true);
                            }
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: self.getView().getModel("i18n").getResourceBundle().getText('Cancel_button'),
                        press: function() {
                            dialog.close();
                        }
                    }),
                    afterClose: function() {
                        dialog.destroy();
                    }
                });
                dialog.open();
            },
            _onRenameFile: function(r) {
                var self = this;
                if (self._properties.mode !== 'D') {
                    var oResponse = this._backendCall(this._ACTION.RENAMEATTACHMENT, r.getParameters().item.getBindingContext("__attachmentData").getObject());
                    if (oResponse === false) {
                        this._backendCall(this._ACTION.LISTATTACHMENT, null);
                    }
                    if (oResponse !== null) {
                        self._updateFile(oResponse);
                    }

                }
            },
            _onDeleteFile: function(e) {
                var oSelf = this;
                var oData = oSelf.byId("attachmentServiceFileUpload").getModel("__attachmentData").getData();
                var aItems = oData.dataitems;
                var aDelItem = e.getParameters().item.getBindingContext("__attachmentData").getObject();
                oSelf.oResult.fileName = e.getParameters().item.getProperty("fileName");
                oSelf._backendCall(oSelf._ACTION.DELETEATTACHMENT, aDelItem);
            },
            _onUploadTerminated: function(oEvent) {
                this.uploadCountTerminated += 1;
                this._showErrorMessage(this.getView().getModel("i18n").getResourceBundle().getText("MESSAGE_UPLOAD_FAILED"), "");
                this.oResult.status = "TERMINATED";
                this.getOwnerComponent().fireOnupload(this.oResult);
                this.getUploadCollectionControl().getModel("__attachmentData").refresh(true);
                if (this.uploadCount === this.uploadCountSuccess + this.uploadCountFailed + this.uploadCountTerminated) {
                    this.oResult.status = "UPLOADCOMPLETED";
                    this.oResult.fileName = "";
                    this.getOwnerComponent().fireOnupload(this.oResult);
                }
                this._getOriginal();

            },
            /***************************************************************************
             * Utilities Methods for Odata Model Binding, Response Parsing and Header
             **************************************************************************/
            _setAttachmentModel: function(dataitem) {
                this.getUploadCollectionControl().getModel("__attachmentData").setData({
                    "dataitems": dataitem
                });
            },
            _prepareResponse: function(body) {
                var msgDetails = {
                    msgDetail: {},
                    innerErrorDetails: []
                };
                var error = JSON.parse(body).error;
                msgDetails.msgDetail.msgText = error.message.value;
                msgDetails.msgDetail.code = error.code;
                error = error.innererror.errordetails;
                jQuery.each(error, function(index) {
                    var msg = {};
                    msg.msgText = error[index].message;
                    msg.code = error[index].code;
                    msg.severity = error[index].severity;
                    msgDetails.innerErrorDetails.push(msg);
                });
                return msgDetails;
            },
            _setOriginal: function(oResult) {
                if (oResult !== null) {
                    var dataitem = [];
                    var i = 0,
                        length = oResult.results.length;
                    for (i = 0; i < length; i++) {
                        dataitem.push(this._mapResult(oResult.results[i]));
                    }
                    this._setAttachmentModel(dataitem);

                }
            },
            _setUploadCollectionHeader: function(name, value, event) {
                var oCustomHeader = new sap.m.UploadCollectionParameter({
                    name: name,
                    value: value
                });
                event.getParameters().addHeaderParameter(oCustomHeader);
            },

            _prepareUrlParameters: function(action, r) {
                var fId, aId, fN, dN, dT, dP, dV, urlParam;
                fId = aId = fN = dN = dT = dP = dV = "";
                if (r !== null) {
                    fId = "FileId='" + encodeURIComponent(r.FileId) + "'";
                    aId = "ApplicationId='" + encodeURIComponent(r.ApplicationId) + "'";
                    //fN = "Filename='" + btoa(encodeURIComponent(r.Filename)) + "'";
                    fN = "Filename='" + encodeURIComponent(r.Filename) + "'";
                    dN = "Documentnumber='" + encodeURIComponent(r.Documentnumber) + "'";
                    dT = "Documenttype='" + encodeURIComponent(r.Documenttype) + "'";
                    dP = "Documentpart='" + encodeURIComponent(r.Documentpart) + "'";
                    dV = "Documentversion='" + encodeURIComponent(r.Documentversion) + "'";
                }
                var oK = "ObjectKey='" + encodeURIComponent(this._properties.objectKey) + "'";
                var oT = "ObjectType='" + encodeURIComponent(this._properties.objectType) + "'";
                var oS = "SemanticObjectType='" + encodeURIComponent(this._properties.semanticObject) + "'";

                switch (action) {
                    case this._ACTION.DELETEATTACHMENT:
                        urlParam = fId + "," + aId + "," + dN + "," + dT + "," + dP + "," + dV;
                        break;
                    case this._ACTION.RENAMEATTACHMENT:
                        urlParam = oK + "&" + oT + "&" + oS + "&" + fId + "&" + aId + "&" + fN + "&" + dN + "&" + dT + "&" + dP + "&" + dV;
                        break;
                    case this._ACTION.LISTATTACHMENT:
                        urlParam = oK + "&" + oT + "&" + oS + "&IsDraft=" + this.getOwnerComponent().getIsDraft();
                        break;
                    default:
                        urlParam = oK + "&" + oT + "&" + oS;
                }
                return (urlParam);
            },
            _prepareUrlParametersForArchiveLink: function(action) {
                var oK = "ArchiveObjectID='" + encodeURIComponent(this._properties.objectKey) + "'";
                var oT = "ArchiveObjectType='" + encodeURIComponent(this._properties.objectType) + "'";
                var oS = "SemanticObjectType='" + encodeURIComponent(this._properties.semanticObject) + "'";
                return (oK + "&" + oT + "&" + oS);
            },
            _prepareParametersToCreateUrl: function(action) {
                var oK = "ObjectKey='" + encodeURIComponent(this._properties.objectKey) + "'";
                var oT = "ObjectType='" + encodeURIComponent(this._properties.objectType) + "'";
                var oS = "SemanticObjectType='" + this._properties.semanticObject + "'";
                var Ur = "URL='" + encodeURIComponent(sap.ui.getCore().byId("URL").getValue()) + "'";
                var dt = "DocumentType='" + encodeURIComponent(this._properties.documentType) + "'";
                this._checkUrl(Ur);
                // var Urf =  Ur.replace(/&/g, "%26");
                var uD;
                // if (sap.ui.getCore().byId("URLDesc").getValue() !== "") {
                // 	uD = "UrlDescription='" + encodeURIComponent(sap.ui.getCore().byId("URLDesc").getValue()) + ". '";
                // } else {
                uD = "UrlDescription='" + encodeURIComponent(sap.ui.getCore().byId("URLDesc").getValue()) + "'";

                // uD = encodeURI(uD);
                // Ur = encodeURI(Ur);
                var mT = "MIMEType='text/url'";
                return oK + "&" + oT + "&" + oS + "&" + uD + "&" + Ur + "&" + mT + "&" + dt;
            },

            _checkUrl: function(url) {
                //var RegExp1 = /^(ftp|http|https):\/\/(\w+)(:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/i;
                var RegExp1 = /^(ftp|http|https):\/\/?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/ig;
                if (RegExp1.test(url)) {
                    return true;
                } else {
                    return false;
                }
            },
            _setHeader: function(action) {
                var oHeader = {
                    "objectkey": btoa(encodeURIComponent(this._properties.objectKey)),
                    "objecttype": this._properties.objectType,
                    "semanticobjecttype": this._properties.semanticObject
                };

                if (action === this._ACTION.DELETEATTACHMENT) {
                    oHeader.MarkForDeletion = true;
                }
                return oHeader;
            },
            _changeHostname: function(linkStr) {
                var link = linkStr.split("/");
                link[2] = location.hostname + (location.port ? ":" + location.port : "");
                return link.join("/");
            },
            _formatObjectKey: function(oKey) {
                var oFormattedKey = oKey.replace(/[-]/g, "");
                // if transformation fails, use input Guid as a fallback  
                if (oFormattedKey === "") {
                    oFormattedKey = oKey;
                }
                return oFormattedKey;
            },
            _formatFileSize: function(sValue) {
                if (jQuery.isNumeric(sValue)) {
                    return sap.ui.core.format.FileSizeFormat.getInstance({
                        binaryFilesize: true,
                        maxFractionDigits: 2,
                        maxIntegerDigits: 3
                    }).format(sValue);
                } else {
                    return sValue;
                }
            },
            _showAttachmentsNumber: function() {
                this.getView().byId("attachmentTitle").setVisible(this._fieldControl._VisibleAttributes.ATTACHMENTTITLE);
                var attachmentNo = this.getUploadCollectionControl().getItems().length;
                var attachmentTitleText = this.getView().getModel("i18n").getResourceBundle().getText("Attachment_Title");
                var shownText = attachmentTitleText + " (" + attachmentNo.toString() + ")";
                return shownText;
            },
            _mapResult: function(oFile) {
                if (oFile.Documentnumber && this._properties.documentNumber === "") {
                    this._properties.documentPart = oFile.Documentpart;
                    this._properties.documentVersion = oFile.Documentversion;
                    this._properties.documentNumber = oFile.Documentnumber;
                    this._properties.documentType = oFile.Documenttype;
                }
                var authRename = false,
                    authDel = false; //variables to hold user auth details
                if (oFile.UxFCDelete === 1) {
                    authDel = true;
                }
                if (oFile.UxFCRename === 1) {
                    authRename = true;
                }
                var object = {
                    "content_type": oFile.__metadata.content_type,
                    "Filename": oFile.Filename,
                    //	"url" : oFile.__metadata.media_src,
                    "url": this._getLinkStatus(oFile),
                    "FileId": oFile.FileId ? oFile.FileId : oFile.ArchiveDocumentID,
                    "ApplicationId": oFile.ApplicationId,
                    "Documentnumber": oFile.Documentnumber,
                    "Documenttype": oFile.Documenttype,
                    "Documentversion": oFile.Documentversion,
                    "Documentpart": oFile.Documentpart,
                    "enableEdit": this._getEditMode(),
                    "enableDelete": this._getDeleteMode() && authDel,
                    "visibleEdit": this._properties.visibleEdit && authRename,
                    "visibleDelete": this._properties.visibleDelete && authDel,
                    "fileSize": oFile.Filesize,
                    "uploadedBy": oFile.FullName,
                    "status": oFile.AttachmentStatus ? oFile.AttachmentStatus : ((this._getStatuses(oFile).length - 1) > 0 ?
                        this._getStatuses(oFile)[this._getStatuses(oFile).length - 1].text : "Checked-in"),
                    "attributes": this._getAttributes(oFile),
                    "statuses": this._getStatuses(oFile)
                };
                return object;
            },

            _getLinkStatus: function(oFile) {
                var url = '';

                if (this._fieldControl._VisibleAttributes.ENABLELINK === true) {
                    if (oFile.ContentSource && oFile.ContentSource.length > 0) {
                        url = oFile.ContentSource;
                    } else {
                        url = this._changeHostname(oFile.__metadata.media_src);
                    }
                } else {
                    url = '';
                }

                return url;

            },
            _getStatuses: function(oFile) {
                var statusList = [];
                var tempStatus;
                var draftDetails = {
                    "title": this.getView().getModel("i18n").getResourceBundle().getText("Status_Title"),
                    "text": this.getView().getModel("i18n").getResourceBundle().getText("Draft_Title")

                };
                if (this._fieldControl._VisibleAttributes.ATTACHMENTSTATUS && oFile.AttachmentStatus === "DRAFT") {
                    statusList.push(draftDetails);
                }
                if (this._fieldControl._VisibleAttributes.SOURCE && oFile.Source) {
                    var sourceDetails = {
                        "title": this.getView().getModel("i18n").getResourceBundle().getText("Source_Title"),
                        "text": oFile.Source,
                        "state": "Success"
                    };
                    statusList.push(sourceDetails);
                }
                if (this.checkedInStatusShow) {
                    if (oFile.CheckedInStatus === true) {
                        tempStatus = {
                            "text": this.getView().getModel("i18n").getResourceBundle().getText("CheckedIn"),
                            "icon": "sap-icon://locked",
                            "state": "Success"
                        };
                    } else {
                        tempStatus = {
                            "text": this.getView().getModel("i18n").getResourceBundle().getText("CheckedOut"),
                            "icon": "sap-icon://unlocked",
                            "state": "Error"
                        };
                    }
                    statusList.push(tempStatus);
                }

                return statusList;
            },
            _getAttributes: function(oFile) {
                var attrList = [];
                var temp = {};
                if (this._fieldControl._VisibleAttributes.UPLOADEDBY === true) {
                    temp = {
                        "title": this.getView().getModel("i18n").getResourceBundle().getText("Uploaded_By_Title"),
                        "text": oFile.FullName,
                        "visible": this._fieldControl._VisibleAttributes.UPLOADEDBY
                    };
                    attrList.push(temp);
                }

                if (this._fieldControl._VisibleAttributes.UPLOADEDON === true) {
                    temp = {
                        "title": this.getView().getModel("i18n").getResourceBundle().getText("Uploaded_On_Title"),
                        "text": sap.ui.core.format.DateFormat.getDateTimeInstance({
                            pattern: "dd-MM-yyyy HH:mm:ss"
                        }).format(oFile.CreatedAt),
                        "visible": this._fieldControl._VisibleAttributes.UPLOADEDON
                    };
                    attrList.push(temp);
                }

                if (this._fieldControl._VisibleAttributes.FILESIZE === true) {
                    if (oFile.ContentType !== "text/url") {
                        temp = {
                            "title": this.getView().getModel("i18n").getResourceBundle().getText("File_Size_Title"),
                            "text": this._formatFileSize(oFile.Filesize),
                            "visible": this._fieldControl._VisibleAttributes.FILESIZE
                        };

                        attrList.push(temp);

                    }
                }
                //if (this._fieldControl._VisibleAttributes.DIRDETAILS === true) {
                if (oFile.Documentnumber && this._fieldControl._VisibleAttributes.DIRDETAILS === true) {
                    temp = {
                        "title": this.getView().getModel("i18n").getResourceBundle().getText("DIR_Details"),
                        "text": oFile.Documenttype + "/" + oFile.Documentnumber + "/" + oFile.Documentversion + "/" + oFile.Documentpart,
                        "active": true,
                        "visible": this._fieldControl._VisibleAttributes.DIRDETAILS
                    };
                    attrList.push(temp);
                } else if (oFile.Documenttype && this._fieldControl._VisibleAttributes.DIRDETAILS === true) {
                    temp = {
                        "title": this.getView().getModel("i18n").getResourceBundle().getText("Doc_Type"),
                        "text": oFile.Documenttype,
                        "active": false,
                        "visible": this._fieldControl._VisibleAttributes.DIRDETAILS
                    };
                    attrList.push(temp);
                }
                //}
                return attrList;

            },
            /***************************************************************************
             * Methods for Modifing Uploadcollection Properties
             **************************************************************************/
            _getEditMode: function() {
                if (this._properties.documentType === "GOS") {
                    this._properties.visibleEdit = false;
                }
                return this._properties.visibleEdit;
            },
            _getDeleteMode: function() {
                return this._properties.visibleDelete;
            },
            _showErrorMessage: function(msgText, msgDetail) {
                var self = this;
                MessageBox.error(msgText, {
                    icon: MessageBox.Icon.ERROR,
                    title: self.getView().getModel("i18n").getResourceBundle().getText("Error_Title"),
                    actions: [MessageBox.Action.CLOSE],
                    details: msgDetail
                });
            },
            _setActionVisibility: function(isEdit) { // Here isEdit will be true for create and change mode
                this.getView().byId("attachmentTitle").setVisible(this._fieldControl._VisibleAttributes.ATTACHMENTTITLE);
                if (isEdit === true) {
                    //Check the updated JSON and update the action metadata accordingly
                    this._properties.visibleEdit = this._fieldControl._VisibleActions.RENAME;
                    this._properties.visibleDelete = this._fieldControl._VisibleActions.DELETE;
                    this.getUploadCollectionControl().setUploadEnabled(this._fieldControl._VisibleActions.ADD);
                    this.getUploadCollectionControl().setUploadButtonInvisible(!this._fieldControl._VisibleActions.ADD);
                    this.getView().byId("AddUrl").setEnabled(this._fieldControl._VisibleActions.ADDURL);
                    this.getView().byId("AddUrl").setVisible(this._fieldControl._VisibleActions.ADDURL);
                    this.getView().byId("CheckInButton").setEnabled(false);
                    this.getView().byId("CheckOutButton").setEnabled(false);
                    this.getView().byId("ResetCheckOutButton").setEnabled(false);
                    this.getView().byId("Download").setVisible(this._fieldControl._VisibleActions.DOWNLOAD);
                    this.getView().byId("Download").setEnabled(this._fieldControl._VisibleActions.DOWNLOAD);
                    this.getView().byId("DocTypeSelect").setVisible(true);
                    this.getView().byId("DocTypeSelect").setEnabled(true);
                    this.getView().byId("assignDIR").setVisible(true);
                    this.getView().byId("assignDIR").setEnabled(true);
                    this.getView().byId("unassignDIR").setVisible(true);
                    this.getView().byId("unassignDIR").setEnabled(true);
                    this.flavorControl(this.getOwnerComponent().getFlavor());
                } else {
                    this._properties.visibleEdit = false;
                    this._properties.visibleDelete = false;
                    this.getUploadCollectionControl().setUploadEnabled(false);
                    this.getUploadCollectionControl().setUploadButtonInvisible(!this._fieldControl._VisibleActions.ADD);
                    this.getView().byId("AddUrl").setEnabled(false);
                    this.getView().byId("AddUrl").setVisible(this._fieldControl._VisibleActions.ADDURL);
                    this.getView().byId("CheckInButton").setEnabled(false);
                    this.getView().byId("CheckOutButton").setEnabled(false);
                    this.getView().byId("ResetCheckOutButton").setEnabled(false);
                    this.getView().byId("Download").setVisible(this._fieldControl._VisibleActions.DOWNLOAD);
                    this.getView().byId("Download").setEnabled(true);
                    // this.getUploadCollectionControl().setNoDataDescription("");
                    this.getUploadCollectionControl().setMode("None");
                    this.getView().byId("assignDIR").setVisible(true);
                    this.getView().byId("assignDIR").setEnabled(false);
                    this.getView().byId("unassignDIR").setVisible(true);
                    this.getView().byId("unassignDIR").setEnabled(false);
                    this.flavorControl(this.getOwnerComponent().getFlavor());
                    this.getView().byId("DocTypeSelect").setVisible(false);
                    this.getView().byId("DocTypeSelect").setEnabled(false);
                }
            },
            _setProperty: function() {
                switch (this._properties.mode) {
                    case this._MODE.CREATE:
                        var dataitem = [];
                        this._setAttachmentModel(dataitem);
                        this._setActionVisibility(true);
                        break;
                    case this._MODE.CHANGE:
                        this._setActionVisibility(true);
                        break;
                    default:
                        this._setActionVisibility(false);
                }
            },
            _onSelectionChange: function() {
                var oUploadCollection = this.getUploadCollectionControl();
                // If there's any item selected, sets checkout button enabled
                if (oUploadCollection.getSelectedItems().length > 0 && (this._properties.mode === this._MODE.CREATE || this._properties.mode ===
                        this._MODE.CHANGE)) {
                    this.getView().byId("CheckOutButton").setEnabled(true);
                    this.getView().byId("ResetCheckOutButton").setEnabled(true);
                    if (oUploadCollection.getSelectedItems().length === 1) {
                        var selectedIndex = oUploadCollection.getSelectedItems()[0].getBindingContext("__attachmentData").getPath().split("/")[2];
                        var contentType = oUploadCollection.getSelectedItems()[0].getBindingContext("__attachmentData").getModel().oData.dataitems[
                            selectedIndex].content_type;
                        var currentStatus = oUploadCollection.getSelectedItems()[0].getBindingContext("__attachmentData").getModel().oData.dataitems[
                            selectedIndex].statuses[0].text;
                        if (contentType !== "text/url" && currentStatus !== this.getView().getModel(
                                "i18n").getResourceBundle().getText("CheckedIn")) {
                            this.getView().byId("CheckInButton").setEnabled(true);
                        } else if (contentType === "text/url") {
                            this.getView().byId("CheckOutButton").setEnabled(false);
                            this.getView().byId("CheckInButton").setEnabled(false);
                            this.getView().byId("ResetCheckOutButton").setEnabled(false);
                        }
                    } else {
                        this.getView().byId("CheckInButton").setEnabled(false);
                    }
                } else {
                    this.getView().byId("CheckOutButton").setEnabled(false);
                    this.getView().byId("CheckInButton").setEnabled(false);
                    this.getView().byId("ResetCheckOutButton").setEnabled(false);
                }
            },
            _onAttributePress: function(oEvent) {
                var concatDIR = oEvent.getSource().getText();
                var splitDIRArray = concatDIR.split("/");
                var fgetService = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService;
                if (fgetService) {
                    this.oCrossAppNavigator = fgetService && fgetService("CrossApplicationNavigation");
                    if (this.getOwnerComponent().getMode() === "C") {
                        this.oCrossAppNavigator.toExternal({
                            target: {
                                semanticObject: "DocumentInfoRecord",
                                action: "manage"
                            },
                            params: {
                                "DocumentInfoRecordDocNumber": splitDIRArray[1],
                                "DocumentInfoRecordDocType": splitDIRArray[0],
                                "DocumentInfoRecordDocPart": splitDIRArray[3],
                                "DocumentInfoRecordDocVersion": splitDIRArray[2]
                            }
                        });
                    } else {
                        this.oCrossAppNavigator.toExternal({
                            target: {
                                semanticObject: "DocumentInfoRecord",
                                action: "display"
                            },
                            params: {
                                "DocumentInfoRecordDocNumber": splitDIRArray[1],
                                "DocumentInfoRecordDocType": splitDIRArray[0],
                                "DocumentInfoRecordDocPart": splitDIRArray[3],
                                "DocumentInfoRecordDocVersion": splitDIRArray[2]
                            }
                        });
                    }

                }
            },
            _onCheckIn: function(oEvent) {
                var oButton = oEvent.getSource();
                if (!this._actionSheet) {
                    this._actionSheet = sap.ui.xmlfragment(
                        "zi2d.eam.malfunction.manages1.component.attachment.fragment.checkInActionSheet",
                        this
                    );
                    this.getView().addDependent(this._actionSheet);
                }
                this._actionSheet.openBy(oButton);

            },
            _onCheckInOriginalPress: function(oEvent) {
                var oUploadCollection = this.getUploadCollectionControl();
                this.itemforcheckingin = oUploadCollection.getSelectedItem();
                this.checkingIn = true;
                oUploadCollection.setMultiple(false);
                oUploadCollection.openFileDialog();
                oUploadCollection.setMultiple(true);

            },
            _onCheckInAsNewVersionPress: function(oEvent) {
                var oUploadCollection = this.getUploadCollectionControl();
                this.itemforcheckingin = oUploadCollection.getSelectedItem();
                this.checkingInAsNewVersion = true;
                oUploadCollection.setMultiple(false);
                oUploadCollection.openFileDialog();
                oUploadCollection.setMultiple(true);
            },
            fieldControlFileOperations: function(opeartionName) {
                var oUploadCollection = this.getUploadCollectionControl();
                if (oUploadCollection.getSelectedItems().length === 1) {
                    switch (opeartionName) {
                        case "CheckIn":
                            this.getView().byId("CheckInButton").setEnabled(false);
                            this.getView().byId("ResetCheckOutButton").setEnabled(false);
                            this.getView().byId("CheckOutButton").setEnabled(true);
                            break;
                        case "CheckOut":
                            this.getView().byId("CheckOutButton").setEnabled(false);
                            this.getView().byId("CheckInButton").setEnabled(true);
                            this.getView().byId("ResetCheckOutButton").setEnabled(true);
                            break;
                        case "ResetCheckOut":
                            this.getView().byId("ResetCheckOutButton").setEnabled(false);
                            this.getView().byId("CheckInButton").setEnabled(false);
                            this.getView().byId("CheckOutButton").setEnabled(true);
                            break;
                        default:
                            this.getView().byId("CheckInButton").setEnabled(false);
                            this.getView().byId("ResetCheckOutButton").setEnabled(true);
                            this.getView().byId("CheckOutButton").setEnabled(true);
                    }
                } else {
                    this.getView().byId("CheckInButton").setEnabled(false);
                    this.getView().byId("ResetCheckOutButton").setEnabled(false);
                    this.getView().byId("CheckOutButton").setEnabled(false);
                }
            },
            _onCheckOut: function() {
                var self = this;
                var prop;
                var oUploadCollection = this.getUploadCollectionControl();
                var aSelectedItems = oUploadCollection.getSelectedItems();
                if (aSelectedItems) {

                    for (var i = 0; i < aSelectedItems.length; i++) {
                        var oAttachmentData = aSelectedItems[i].getBindingContext("__attachmentData").getProperty("");
                        prop = this._getSelectedItemProperties(aSelectedItems[i], oUploadCollection);
                        // var encodeURL = encodeURI("ApplicationId='"+prop.ApplicationId+"'&FileId='"+prop.FileId+"'"); //"ObjectKey=%27demo_test%27&ObjectType=%27bus1001006%27&SemanticObjectType=%27Product%27";//
                        self._objects.oModel.callFunction("/CheckOut", {
                            method: "POST",
                            urlParameters: {
                                ApplicationId: prop.ApplicationId,
                                FileId: prop.FileId,
                                DocumentInfoRecordDocType: oAttachmentData.Documenttype,
                                DocumentInfoRecordDocNumber: oAttachmentData.Documentnumber,
                                DocumentInfoRecordDocVersion: oAttachmentData.Documentversion,
                                DocumentInfoRecordDocPart: oAttachmentData.Documentpart
                            },
                            success: function(oData) {
                                oUploadCollection.downloadItem(aSelectedItems[i], true);
                                self._updateFile(oData);
                                self.fieldControlFileOperations("CheckOut");
                            },
                            error: function(e) {
                                self._showErrorMessage(JSON.parse(e.response.body).error.message.value, "");
                            }
                        });
                    }
                }
            },
            _onResetCheckOut: function() {
                var self = this;
                var prop;
                var oUploadCollection = this.getUploadCollectionControl();
                var aSelectedItems = oUploadCollection.getSelectedItems();
                if (aSelectedItems) {

                    for (var i = 0; i < aSelectedItems.length; i++) {
                        prop = this._getSelectedItemProperties(aSelectedItems[i], oUploadCollection);
                        // var encodeURL = encodeURI("ApplicationId='"+prop.ApplicationId+"'&FileId='"+prop.FileId+"'"); //"ObjectKey=%27demo_test%27&ObjectType=%27bus1001006%27&SemanticObjectType=%27Product%27";//
                        self._objects.oModel.callFunction("/ResetCheckOut", {
                            method: "POST",
                            urlParameters: {
                                ApplicationId: prop.ApplicationId,
                                FileId: prop.FileId
                            },
                            success: function(oData) {
                                self._updateFile(oData);
                                self.fieldControlFileOperations("ResetCheckOut");
                            },
                            error: function(e) {
                                self._showErrorMessage(JSON.parse(e.response.body).error.message.value, "");
                            }
                        });
                    }
                }
            },

            _getSelectedItemProperties: function(SelectedItem, oUploadCollection) {
                var retProp = SelectedItem.data();
                return retProp;
            },
            _updateFile: function(fileDetails) {
                var self = this;
                var oData = this.getUploadCollectionControl().getModel("__attachmentData").getData();
                var aItems = jQuery.extend(true, {}, oData).dataitems;
                // Adds the new metadata to the file which was updated.
                for (var i = 0; i < aItems.length; i++) {
                    if (aItems[i].ApplicationId === fileDetails.ApplicationId) {
                        aItems[i] = self._mapResult(fileDetails);
                    }
                }
                // Updates the model.
                this._setAttachmentModel(aItems);
            },
            /***************************************************************************
             * Component Related Methods
             **************************************************************************/
            commitChanges: function(isRefresh) {
                return this._commitChanges(isRefresh);
            },
            cancelChanges: function(isRefresh) {
                return this._cancelChanges(isRefresh);
            },
            setModeProperty: function(value) {
                this._properties.mode = value;
                var modeChanged = value === "C" || value === "I" ? this.getView().getModel("__attachmentModel").setProperty("/changeEnabled", true) :
                    this.getView()
                    .getModel("__attachmentModel").setProperty("/changeEnabled", false);
                this._setProperty();
            },
            setDocTypeProperty: function(value) {
                this._properties.documentType = value;
            },

            setProperties: function(asMode, objectType, objectKey, semanticObject, docType) {
                if ((objectType || semanticObject) && objectKey) {
                    this.byId("attachmentServiceVBoxPage").setVisible(true);
                    // this.getOwnerComponent().setProperty("objectKey", objectKey);
                    // this.getOwnerComponent().setProperty("objectType", objectType);
                    // this.getOwnerComponent().setProperty("mode", asMode);
                    // this.getOwnerComponent().setProperty("semanticObject", semanticObject);
                    if (this.getOwnerComponent().getAttributeHandling()) {
                        this.setAttributes(this.getOwnerComponent().getAttributeHandling());
                    }
                    if (this.getOwnerComponent().getIsGuid() === false) {
                        this._properties.objectKey = objectKey;
                    } else {
                        this._properties.objectKey = this._formatObjectKey(objectKey);
                        this.getOwnerComponent().setProperty("objectKey", this._properties.objectKey);
                    }
                    this._properties.objectType = objectType;
                    this._properties.semanticObject = semanticObject;
                    this._properties.mode = asMode;
                    this._properties.documentPart = "";
                    this._properties.documentVersion = "";
                    this._properties.documentNumber = "";
                    if (docType) {
                        this._properties.documentType = docType;
                    }
                    this.setModeProperty(asMode);

                    if (this._properties.objectKey && (this._properties.objectType || this._properties.semanticObject)) {
                        this._getOriginal();
                    } else {
                        this._properties.mode = 'D';
                    }
                }
            },
            getApplicationState: function() {
                if ((this._properties.objectType || this._properties.semanticObject) && this._properties.objectKey) {
                    return this._getApplicationState();
                }
            },
            getAttachmentCount: function() {
                if ((this._properties.objectType || this._properties.semanticObject) && this._properties.objectKey) {
                    return this._getAttachmentCount();
                }
            },
            downloadDirectAttachments: function(aParameters, downloadFromRep) {
                var self = this;
                jQuery.each(aParameters, function(index) {
                    LargeFileHandler.getFileFromUrl.call(self, aParameters[index].FileId, aParameters[index].Documentnumber, aParameters[index].Documenttype,
                        aParameters[index].Documentpart, aParameters[index].Documentversion, aParameters[index].ApplicationId, downloadFromRep);
                });
            },
            checkOut: function(oCheckoutModel, callBack) {
                var oResponseObject = {
                    success: false,
                    message: ""
                };
                this._objects.oModel.callFunction("/CheckOut", {
                    method: "POST",
                    urlParameters: {
                        ApplicationId: oCheckoutModel.ApplicationId,
                        FileId: oCheckoutModel.FileId
                    },
                    success: function(oData) {
                        oResponseObject.message = "";
                        oResponseObject.success = true;
                        if (callBack) {
                            callBack(oResponseObject);
                        }
                        return oResponseObject;
                    },
                    error: function(e) {
                        var responseBody = JSON.parse(e.response.body);
                        oResponseObject.message = responseBody.error.message.value;
                        oResponseObject.success = false;
                        if (callBack) {
                            callBack(oResponseObject);
                        }
                        return oResponseObject;
                    }
                });
            },
            _onDocTypeSelect: function(oEvent) {
                this._properties.documentType = oEvent.getParameters().selectedItem.getProperty("key");
            },
            getAttachmentsByAlternateKey: function(objectType, objectKey, semanticObject, callBack) {
                this._objects.oModel.callFunction("/GetAttachmentsByAlternateKey", {
                    method: "GET",
                    urlParameters: {
                        ObjectType: objectType,
                        ObjectKey: objectKey,
                        SemanticObject: semanticObject
                    },
                    success: function(oData) {
                        if (callBack) {
                            callBack(oData.results);
                        }
                        return oData;
                    },
                    error: function(e) {
                        return (this._showErrorMessage(JSON.parse(e.response.body).error.message.value, ""));
                    }
                });
            },
            onViewSettingsPressed: function(oEvent) {
                if (!this._oDialog) {
                    this._oDialog = sap.ui.xmlfragment("zi2d.eam.malfunction.manages1.component.attachment.fragment.grouping", this);
                    this._oDialog.setModel(this.getView().byId("DocTypeSelect").getModel("__DocType"), "__DocType");
                }
                // toggle compact style
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oDialog);
                this.getView().addDependent(this._oDialog);
                this._oDialog.open();
            },
            onViewSettingsClearFilters: function(oEvent) {
                this.onViewSettingsConfirm(oEvent);
            },
            onInfoToolbarPressed: function(oEvent) {
                if (oEvent.getParameters().srcControl === this.byId("icClearFilters")) {
                    this.onViewSettingsClearFilters(oEvent);
                } else {
                    this.onViewSettingsPressed(oEvent);
                }
            },
            onViewSettingsConfirm: function(oEvent) {
                var that = this;
                var oUploadCollection = this.byId("attachmentServiceFileUpload");
                var oInfoToolbar = oUploadCollection.getInfoToolbar();
                var oBindingItems = oUploadCollection.getBinding("items");
                var mParams = oEvent.getParameters();
                var aSorters = [],
                    sPath, vGroup, bDescending;

                // apply grouping
                if (mParams.groupItem) {
                    sPath = mParams.groupItem.getKey();
                    bDescending = mParams.groupDescending;
                    vGroup = this.mGroupFunctions[sPath];
                    aSorters.push(new Sorter(sPath, bDescending, vGroup));
                }
                // apply sorting
                if (mParams.sortItem) {
                    sPath = mParams.sortItem.getKey();
                    bDescending = mParams.sortDescending;
                    aSorters.push(new Sorter(sPath, bDescending));
                }
                oBindingItems.sort(aSorters);

                // apply filters to binding
                var aFilters = [];
                jQuery.each(mParams.filterItems, function(i, oItem) {
                    var sOperator = FilterOperator.EQ;
                    var sValue = oItem.getKey();
                    if (sValue === that.getView().getModel("i18n").getResourceBundle().getText("CheckedIn") || sValue === that.getView().getModel(
                            "i18n").getResourceBundle().getText("CheckedOut") || sValue === that.getView().getModel("i18n").getResourceBundle().getText(
                            "Draft")) {
                        sPath = "status";
                    } else {
                        sPath = "Documenttype";
                    }
                    //var oFilter = new sap.ui.model.Filter(sPath, sap.ui.model.FilterOperator.EQ, sValue);
                    var oFilter = new Filter(sPath, sOperator, sValue);
                    aFilters.push(oFilter);
                });

                oBindingItems.filter(aFilters);

                // update filter bar
                oInfoToolbar.setVisible(aFilters.length > 0);
                var sFilterString = "";
                if (mParams.filterString) {
                    sFilterString = mParams.filterString;
                }
                oInfoToolbar.getContent()[0].setText(sFilterString);
            },
            getGroupHeader: function(oGroup) {
                if (oGroup && !oGroup.text) {
                    oGroup.text = "Document Type";
                }

                if (oGroup && this.getOwnerComponent().getFlavor() === "withDocType") {
                    return new GroupHeaderListItem({
                        title: oGroup.text + ": " + oGroup.key,
                        upperCase: false
                    });
                }
            },

            _onAssignUnassignDIR: function(oEvent) {
                var self = this;
                if (oEvent.getSource().getText() === self.getView().getModel("i18n").getResourceBundle().getText("Assign_DIR")) {
                    assignUnassign.loadValueHelpDialog.call(self, true);
                } else {
                    assignUnassign.loadValueHelpDialog.call(self, false);
                }

            },
            getSearchFields: function(sParam) {
                if (sParam === "Type") {
                    return (
                        new sap.m.Select({
                            showSecondaryValues: true,
                            selectedKey: "__DocType>/dataItems/0",
                            items: {
                                path: '__DocType>/dataItems',

                                template: new sap.ui.core.ListItem({
                                    text: "{__DocType>DocumentInfoRecordDocType_Text}",
                                    key: "{__DocType>DocumentInfoRecordDocType}",
                                    additionalText: "{__DocType>DocumentInfoRecordDocType}"
                                })
                            }
                        }).setModel(this.getView().byId("DocTypeSelect").getModel("__DocType"), "__DocType")
                    );
                } else {
                    return (new sap.m.Input());
                }
            },
            addRemoveObjectLink: function(assignUnassignFlag, selectedDIR, aKeys) {
                var self = this;
                this.oModel.callFunction("/AssignUnassignObjectLink", {
                    method: "POST",
                    urlParameters: {
                        AssignIndicator: assignUnassignFlag,
                        DocumentInfoRecordDocNumber: selectedDIR.DocumentInfoRecordDocNumber,
                        DocumentInfoRecordDocPart: selectedDIR.DocumentInfoRecordDocPart,
                        DocumentInfoRecordDocType: selectedDIR.DocumentInfoRecordDocType,
                        DocumentInfoRecordDocVersion: selectedDIR.DocumentInfoRecordDocVersion,
                        ObjectType: this._properties.objectType,
                        ObjectKey: this._properties.objectKey
                    },
                    success: function(oData, resp) {},
                    error: function(oError) {
                        self._showErrorMessage(JSON.parse(oError.responseText).error.message.value, "");
                    }
                });

            }
        });

    }, /* bExport= */ true);
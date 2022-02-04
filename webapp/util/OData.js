sap.ui.define([
    "sap/ui/base/Object"
], function(BaseObject) {
    "use strict";
    return BaseObject.extend("zi2d.eam.malfunction.manages1.util.OData", {
        _oModel: null,

        constructor: function(oModel) {
            this._oModel = oModel;
        },

        /**
         * Checks whether a given entity contains a field (according to the service metadata document).
         * This method is useful for interoperability-relevant corrections, i.e. those corrections with frontend and backend part.
         * Attention: this method assumes that all metadata has been loaded already!
         * 
         * @param {string} sEntityName Name of entity in OData model
         * @param {string} sField Name of field to check
         * @returns {boolean} True if field is present; false if it isn't
         */
        entityTypeHasField: function(sEntityName, sField) {
            try {
                var oMetaModel = this._oModel.getMetaModel().getMetaContext("/" + sEntityName + "/" + sField);
                return oMetaModel ? true : false;
            } catch (e) {
                return false;
            }
        },

        /**
         * Resolves an entity into a description text: "Description (ID)".
         * This method determines the text element association exposed via the OData annotation com.sap.vocabularies.Common.v1.Text (or sap:text).
         * If the entity has not been read yet, it will be read partially.
         * 
         * @param {string} sEntityName Name of entity in OData model
         * @param {string} sField Name of field in entity for which a description is expected
         * @param {object} mKey Key-value pairs for key fields of entity. Currently the method expects that all key fields are supplied.
         * @returns {Promise} Promise resolves with description text and ID; rejects in case of failure.
         */
        resolveIdAndDescription: function(sEntityName, sField, mKey) {
            var that = this,
                oMetaModel = this._oModel.getMetaModel(),
                bTextOnly = false,
                sTextElement;

            return oMetaModel.loaded().then(function() {
                var oEntity = oMetaModel.getMetaContext("/" + sEntityName).getObject(),
                    oField = oMetaModel.getMetaContext("/" + sEntityName + "/" + sField).getObject(),
                    mEntityKey = {},
                    sEntityKey;

                if (oField["sap:text"]) {
                    sTextElement = oField["sap:text"];
                } else if (oField["com.sap.vocabularies.Common.v1.Text"]) {
                    sTextElement = oField["com.sap.vocabularies.Common.v1.Text"].Path;
                } else {
                    return Promise.reject();
                }

                if (oField["com.sap.vocabularies.Common.v1.Text"] &&
                    oField["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"] &&
                    oField["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember.indexOf("TextOnly") !== -1) {
                    bTextOnly = true;
                }

                for (var k in oEntity.key.propertyRef) {
                    if (oEntity.key.propertyRef.hasOwnProperty(k)) {
                        // Could use this here to determine if read happens via key or $filter
                        var sKeyFieldName = oEntity.key.propertyRef[k].name;
                        if (mKey[sKeyFieldName]) {
                            mEntityKey[sKeyFieldName] = mKey[sKeyFieldName];
                        }
                    }
                }

                sEntityKey = that._oModel.createKey("/" + sEntityName, mEntityKey);
                var oData = that._oModel.getProperty(sEntityKey);
                if (oData) {
                    return Promise.resolve(oData);
                }

                return new Promise(function(resolve, reject) {
                    that._oModel.read(sEntityKey, {
                        urlParameters: {
                            // read at least all key fields + text element
                            $select: jQuery.map(mEntityKey, function(oValue, sKey) {
                                return sKey;
                            }).join(",") + "," + sTextElement,
                            $expand: sTextElement.indexOf("/") > -1 ? sTextElement.split("/")[0] : ""
                        },
                        success: resolve,
                        error: reject
                    });
                });
            }).then(function(oResponse) {
                if (bTextOnly) {
                    return Promise.resolve(oResponse[sTextElement]);
                } else {
                    return Promise.resolve(oResponse[sTextElement] + " (" + oResponse[sField] + ")");
                }
            });
        }

    });
});
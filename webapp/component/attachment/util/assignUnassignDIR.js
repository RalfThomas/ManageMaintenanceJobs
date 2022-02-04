sap.ui.define(["sap/ui/base/Object", "sap/m/MessageBox"], function(U, M) {
    "use strict";
    return {
        loadValueHelpDialog: function(a) {
            var t = this;
            t.aTokens = [];
            t.isAssign = a;
            t.aKeys = ["DocumentInfoRecord", "DocumentInfoRecordDocNumber", "DocumentInfoRecordDocType", "DocumentInfoRecordDocVersion", "DocumentInfoRecordDocPart", "DocumentDescription", "FileName"];
            var s = ["DocumentInfoRecord", "DocumentInfoRecordDocNumber", "DocumentInfoRecordDocType", "DocumentInfoRecordDocVersion", "DocumentInfoRecordDocPart", "DocumentDescription", "FileName"];
            var b = ["ObjectKey", "Number", "Type", "Version", "Part", "Desc", "FileName"];
            t.oValueHelpDialog = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({
                title: t.getView().getModel("i18n").getResourceBundle().getText("AssignDIR"),
                supportMultiselect: true,
                key: t.aKeys[0],
                stretch: sap.ui.Device.system.phone,
                supportRanges: false,
                supportRangesOnly: false,
                ok: function(C) {
                    t.aTokens = C.getParameter("tokens");
                    var f = t.oValueHelpDialog.getTable().getSelectedIndices();
                    if (t.aTokens.length > 0) {
                        for (var i = 0; i < t.aTokens.length; i++) {
                            jQuery.each(f, function(h) {
                                if (t.oValueHelpDialog.getTable().getContextByIndex(f[h]).getObject().DocumentInfoRecord === t.aTokens[i].getText()) {
                                    t.addRemoveObjectLink(t.isAssign, t.oValueHelpDialog.getTable().getContextByIndex(f[h]).getObject(), t.aKeys);
                                    return false;
                                }
                            });
                        }
                    }
                    t.oValueHelpDialog.destroy();
                    t.oModel.attachBatchRequestCompleted(function(E) {
                        if (E.getParameters().success) {
                            t._retrieveAttachment(t, true);
                        } else {
                            t._showErrorMessage(t.getView().getModel("i18n").getResourceBundle().getText("DIR_Assignment_Failed"));
                        }
                    });
                },
                cancel: function(C) {
                    t.oValueHelpDialog.destroy();
                },
                tokenRemove: function(E) {
                    var r = E.getParameters().tokenKeys[0];
                    var f = t.oValueHelpDialog.getTable().getSelectedIndices();
                    var h = [];
                    jQuery.each(f, function(i) {
                        if (t.oValueHelpDialog.getTable().getContextByIndex(f[i]).getObject().DocumentInfoRecord === r) {
                            h.push(f[i]);
                        }
                    });
                    jQuery.each(h, function(i) {
                        t.oValueHelpDialog.getTable().removeSelectionInterval(h[i], h[i]);
                    });
                    jQuery.each(t.aTokens, function(i) {
                        if (t.aTokens[i].getKey() === r) {
                            t.aTokens.splice(i, 1);
                            return false;
                        }
                    });
                },
                selectionChange: function(E) {
                    var f = E.getParameters().tableSelectionParams.rowIndex;
                    var h = t.oValueHelpDialog.getTable().getSelectedIndices();
                    if (f >= 0) {
                        var k = t.oValueHelpDialog.getTable().getContextByIndex(f).getObject();
                        var i = f - 1;
                        while (i >= 0) {
                            var l = t.oValueHelpDialog.getTable().getContextByIndex(i).getObject();
                            if (h.indexOf(f) > -1) {
                                if (k.DocumentInfoRecord === l.DocumentInfoRecord) {
                                    t.oValueHelpDialog.getTable().addSelectionInterval(i, i);
                                    i--;
                                } else {
                                    break;
                                }
                            } else {
                                if (k.DocumentInfoRecord === l.DocumentInfoRecord) {
                                    t.oValueHelpDialog.getTable().removeSelectionInterval(i, i);
                                    i--;
                                } else {
                                    break;
                                }
                            }
                        }
                        i = f + 1;
                        while (i <= f + 143 && i < t.oValueHelpDialog.getTable().getBinding().aKeys.length) {
                            var l = t.oValueHelpDialog.getTable().getContextByIndex(i).getObject();
                            if (h.indexOf(f) > -1) {
                                if (k.DocumentInfoRecord === l.DocumentInfoRecord) {
                                    t.oValueHelpDialog.getTable().addSelectionInterval(i, i);
                                    i++;
                                } else {
                                    break;
                                }
                            } else {
                                if (k.DocumentInfoRecord === l.DocumentInfoRecord) {
                                    t.oValueHelpDialog.getTable().removeSelectionInterval(i, i);
                                    i++;
                                } else {
                                    break;
                                }
                            }
                        }
                        t.oValueHelpDialog.setTokens([]);
                        jQuery.each(h, function(r) {
                            var n = false;
                            if (r > t.oValueHelpDialog.getTable().getBinding().aKeys.length) {
                                return false;
                            }
                            for (var j = 0; j < t.aTokens.length; j++) {
                                if (t.aTokens[j].getText() === t.oValueHelpDialog.getTable().getContextByIndex(h[r]).getObject().DocumentInfoRecord) {
                                    n = true;
                                    break;
                                }
                            }
                            if (n === false) {
                                t.aTokens.push(new sap.m.Token({
                                    key: t.oValueHelpDialog.getTable().getContextByIndex(h[r]).getObject().DocumentInfoRecord,
                                    text: t.oValueHelpDialog.getTable().getContextByIndex(h[r]).getObject().DocumentInfoRecord
                                }));
                            }
                        });
                    }
                    if (h.indexOf(f) < 0) {
                        var m = [];
                        jQuery.each(t.aTokens, function(j) {
                            if (t.aTokens[j].getText() === (t.oValueHelpDialog.getTable().getContextByIndex(f) ? t.oValueHelpDialog.getTable().getContextByIndex(f).getObject().DocumentInfoRecord : "")) {
                                m.push(j);
                                return false;
                            }
                        });
                        jQuery.each(m, function(j) {
                            t.aTokens.splice(m[j], 1);
                        });
                    }
                    t.oValueHelpDialog.setTokens(t.aTokens);
                },
                updateSelection: function(E) {
                    t.oValueHelpDialog.getTable().sort();
                }
            });
            t.oValueHelpDialog.setTokens([]);
            t.oValueHelpDialog.setModel(t.getView().getModel("i18n"), "i18n");
            var c = new sap.ui.model.json.JSONModel();
            var d = [];
            var e = [];
            var o = [];
            jQuery.each(b, function(k, v) {
                d.push({
                    label: "{i18n>" + v + "}",
                    template: s[k]
                });
                e.push({
                    label: "{i18n>" + v + "}",
                    key: s[k]
                });
                o.push(new sap.ui.comp.filterbar.FilterGroupItem({
                    groupTitle: "advSearch",
                    groupName: "advSearch",
                    name: v,
                    visible: (v === "ObjectKey" ? false : true),
                    label: "{i18n>" + v + "}",
                    control: t.getSearchFields(v)
                }));
            });
            c.setData({
                cols: d
            });
            t.oValueHelpDialog.setTable(new sap.ui.table.Table());
            t.oValueHelpDialog.getTable().setModel(c, "columns");
            t.oValueHelpDialog.getTable().setModel(t.getOwnerComponent().getModel("i18n"), "i18n");
            if (t.oValueHelpDialog.getTable().bindItems) {
                var T = t.oValueHelpDialog.getTable();
                T.bindAggregation("items", "/", function(i, C) {
                    var f = T.getModel("columns").getData().cols;
                    return new sap.m.ColumnListItem({
                        cells: f.map(function(h) {
                            var j = h.template;
                            return new sap.m.Label({
                                text: "{" + j + "}"
                            });
                        })
                    });
                });
            }
            t.oValueHelpDialog.setRangeKeyFields(e);
            t.oValueHelpDialog.getTable().setEnableSelectAll(false);
            var g = false;
            var F = new sap.ui.comp.filterbar.FilterBar({
                advancedMode: true,
                filterBarExpanded: true,
                showGoOnFB: !sap.ui.Device.system.phone,
                filterGroupItems: o,
                search: function(q) {
                    var h = q || "";
                    var j = arguments[0].getParameters(),
                        k = "";
                    var l = sap.ui.model.FilterOperator.Contains;
                    var f = [],
                        m = [],
                        n;
                    jQuery.each(b, function(i, v) {
                        if (v !== "ObjectKey") {
                            if (v !== "Type") {
                                k = sap.ui.getCore().byId(h.getSource().getBasicSearch()).getValue() || "";
                                if (k && k.length > 0) {
                                    f.push(new sap.ui.model.Filter(s[i], l, k));
                                }
                                n = j.selectionSet[i - 1].getValue();
                                if (n && n.length > 0) {
                                    f.push(new sap.ui.model.Filter(s[i], l, n));
                                }
                            } else {
                                n = j.selectionSet[i - 1].getSelectedItem().getKey();
                                if (n !== "") {
                                    f.push(new sap.ui.model.Filter(s[i], l, n));
                                } else {
                                    k = sap.ui.getCore().byId(h.getSource().getBasicSearch()).getValue() || "";
                                    if (k && k.length > 0) {
                                        f.push(new sap.ui.model.Filter(s[i], l, k));
                                    }
                                }
                            }
                        }
                    });
                    t.oValueHelpDialog.setModel(t.oModel);
                    if (a) {
                        t.oValueHelpDialog.getTable().bindRows({
                            path: "/C_DocInfoRecdAttchDetForBusObj",
                            filters: [new sap.ui.model.Filter({
                                path: "LinkedSAPObject",
                                operator: "EQ",
                                value1: t._properties.objectType
                            })].concat(f),
                            sorters: [new sap.ui.model.Sorter({
                                path: "DocumentInfoRecord"
                            })],
                            error: function(i) {
                                self._showErrorMessage(JSON.parse(i.responseText).error.message.value, "");
                            }
                        });
                    } else {
                        t.oValueHelpDialog.getTable().bindRows({
                            path: "/C_DocInfoRecdObjLinkAttchDet",
                            filters: [new sap.ui.model.Filter({
                                path: "LinkedSAPObject",
                                operator: "EQ",
                                value1: t._properties.objectType
                            }), new sap.ui.model.Filter({
                                path: "LinkedSAPObjectKey",
                                operator: "EQ",
                                value1: t._properties.objectKey
                            })].concat(f),
                            sorters: [new sap.ui.model.Sorter({
                                path: "DocumentInfoRecord"
                            })],
                            error: function(i) {
                                self._showErrorMessage(JSON.parse(i.responseText).error.message.value, "");
                            }
                        });
                    }
                    g = false;
                    t.oValueHelpDialog.update();
                    t.oValueHelpDialog.getTable().attachFirstVisibleRowChanged(function(E) {
                        var r = t.oValueHelpDialog.getTable().getRows();
                        for (var i = 0; i < t.aToken.length; i++) {
                            jQuery.each(r, function(p) {
                                if (p.getBindingContext().getObject().DocumentInfoRecord === t.aToken[i].DocumentInfoRecord) {
                                    t.oValueHelpDialog.getTable().addSelectionInterval(p.getIndex());
                                }
                            });
                        }
                    });
                    t.oValueHelpDialog.getTable().getModel().attachBatchRequestCompleted(function(E) {
                        if (t.aTokens.length > 0) {
                            if (t.oValueHelpDialog.getContent().length > 0) {
                                var p = t.oValueHelpDialog.getTable().getSelectedIndices();
                                var r = p[p.length - 1];
                                for (var i = r + 1; i < t.oValueHelpDialog.getTable().getBinding().aKeys.length && i > 0; i++) {
                                    if (t.oValueHelpDialog.getTable().getContextByIndex(r).getObject().DocumentInfoRecord === t.oValueHelpDialog.getTable().getContextByIndex(i).getObject().DocumentInfoRecord) {
                                        t.oValueHelpDialog.getTable().addSelectionInterval(i, i);
                                    } else {
                                        break;
                                    }
                                }
                            }
                        }
                    });
                }
            });
            t.oValueHelpDialog.setFilterBar(F);
            if (F.setBasicSearch) {
                F.setBasicSearch(new sap.m.SearchField({
                    showSearchButton: sap.ui.Device.system.phone,
                    placeholder: "Search",
                    search: function(E) {
                        g = true;
                        t.oValueHelpDialog.getFilterBar().search();
                    }
                }));
            }
            t.oValueHelpDialog.setRangeKeyFields(e);
            t.oValueHelpDialog.open();
        }
    };
});
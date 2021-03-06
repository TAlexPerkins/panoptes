// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils",
    "Plots/GenericPlot"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils,
              GenericPlot
        ) {

        var DataItemPlotPopup = {};

        DataItemPlotPopup.promptAspects = true;

        DataItemPlotPopup.init = function() {
            Msg.listen('', {type:'CreateDataItemPlot'}, function(scope, info) {
                DataItemPlotPopup.create(info);
            });
        }

        DataItemPlotPopup.create = function(info) {
            var tableInfo = MetaData.mapTableCatalog[info.tableid];

            var content = "";

            content += '<table class="PlotTypeTable" style="max-width: 500px;padding:5px" cellspacing="0" cellpadding="0">';
            $.each(GenericPlot.getCompatiblePlotTypes(tableInfo), function(idx, plottype) {
                var id = 'PlotTypeChoice_'+plottype.typeID;
                content += '<tr id="{id}">'.DQXformat({id:id});
                content += '<td class="DQXLarge"><div style="padding:13px">' + plottype.name + '</div></td>';
                content += '<td><div style="padding:13px">' + plottype.description.DQXformat({item: tableInfo.tableNameSingle, items: tableInfo.tableNamePlural}) + "</div></td>";
                content += "</tr>";
            });
            content += '</div>';
            content += '</table>';

            var chk_promptAspects = Controls.Check(null,{ label: '<span style="color:rgb(80,80,80)"><i>Prompt for plot data before showing plot</i></span>', value: DataItemPlotPopup.promptAspects});

            content += chk_promptAspects.renderHtml();



            var popupID = Popup.create(tableInfo.tableCapNamePlural + ' plots', content);

            $.each(GenericPlot.getCompatiblePlotTypes(tableInfo), function(idx, plottype) {
                var id = 'PlotTypeChoice_'+plottype.typeID;
                $('#'+id).click(function() {
                    DataItemPlotPopup.promptAspects = chk_promptAspects.getValue();
                    Popup.closeIfNeeded(popupID);
                    if (DataItemPlotPopup.promptAspects)
                        DataItemPlotPopup.createAspectSelector(plottype, info);
                    else
                        plottype.Create(tableInfo.id, info.query, {
                            subSamplingOptions: info.subSamplingOptions
                        });
                });
            });

        }


        DataItemPlotPopup.createAspectSelector = function(plottype, info) {


            var isCompatibleProperty = function(dataType, propInfo) {
                if (!dataType)
                    return true;
                if (dataType==propInfo.datatype)
                    return true;
                if (dataType=='Value')
                    return propInfo.isFloat;
                if (dataType=='Category') {
                    if (propInfo.isText) return true;
                    if (propInfo.isBoolean) return true;
                }
                return false;
            }


            var content = '';

            var controls = Controls.CompoundVert([]).setMargin(0);

            var requiredAspects = [];
            var optionalAspects = [];
            $.each(plottype.plotAspects, function(idx, aspectInfo) {
                if (aspectInfo.requiredLevel == 2)
                    requiredAspects.push('"'+aspectInfo.name+'"');
                else
                    optionalAspects.push('"'+aspectInfo.name+'"');
            });
            var str = '<b>Select {lst}:</b>'.DQXformat({lst:requiredAspects.join(', ')});
            if (optionalAspects.length>0)
                str += '<br>(Optional: {lst})'.DQXformat({lst:optionalAspects.join(', ')});
            var headerCtrl = Controls.Html(null, str);

            var tableInfo = MetaData.mapTableCatalog[info.tableid];

            var selectors = [];
            $.each(tableInfo.propertyGroups, function(idx0, groupInfo) {
                var groupSection = null;
                var groupList = null;
                var rowNr = 0;
                $.each(groupInfo.properties, function(idx1, propInfo) {
                    var creatorFunc = null;
                    if (propInfo.settings.showInTable) {
                        states = [{id:'', name:''}];
                        $.each(plottype.plotAspects, function(idx, aspectInfo) {
                            if (isCompatibleProperty(aspectInfo.dataType, propInfo))
                                states.push({id: aspectInfo.id, name: aspectInfo.name+' :' });
                        });
                        if (states.length>1) {
                            if (!groupList) {
                                groupList = Controls.CompoundGrid().setSeparation(4,0);
                                groupSection = Controls.Section(groupList, {
                                    title: groupInfo.Name,
                                    headerStyleClass: 'DQXControlSectionHeader',
                                    bodyStyleClass: 'ControlsSectionBodySubSection'
                                });
                                controls.addControl(groupSection);
                            }
                            var cmb = Controls.Combo(null, {label: '', states: states, width:130});
                            cmb.setOnChanged(function() {
                                $.each(selectors, function(idx, selector) {
                                    if (selector.propInfo.propid!=propInfo.propid) {
                                        if (selector.cmb.getValue()==cmb.getValue())
                                            selector.cmb.modifyValue('');
                                    }
                                });
                            });
                            selectors.push({ cmb: cmb, propInfo: propInfo});
                            groupList.setItem(rowNr, 0, cmb);
                            groupList.setItem(rowNr, 1, Controls.Static('<span title="{title}">{name}</span> <span style="color:rgb(170,170,170)">({datatype})</span>'.DQXformat({
                                name: propInfo.name,
                                title: propInfo.settings.Description || '',
                                datatype: propInfo.dispDataType
                            })));
                            rowNr += 1;
                        }
                    }
                })
            });

            content += headerCtrl.renderHtml() + '<br>';
            content += '<div style="background-color:white; border:1px solid rgb(100,190,200); min-width: 450px; max-height:450px; overflow-y:auto">';
            content += controls.renderHtml() + '</div><p>';
            var buttonCreatePlot = Controls.Button(null, { content: '<b>Create plot</b>', buttonClass: 'PnButtonLarge', width:120, height:40, bitmap:'Bitmaps/chart.png' });
            buttonCreatePlot.setOnChanged(function() {
                var aspects = {};
                $.each(selectors, function(idx, selector) {
                    if (selector.cmb.getValue())
                        aspects[selector.cmb.getValue()] = selector.propInfo.propid;
                });

                //Check for missing required aspects
                var missingAspects = [];
                $.each(plottype.plotAspects, function(idx, aspectInfo) {
                    if ((aspectInfo.requiredLevel == 2) && (!aspects[aspectInfo.id]) ) {
                        missingAspects.push(aspectInfo.name);
                    }
                });
                if (missingAspects.length>0) {
                    alert('Please associate the following plot aspect(s) to data properties: \n\n'+missingAspects.join(', '));
                    return;
                }

                Popup.closeIfNeeded(popupID);
                    plottype.Create(tableInfo.id, info.query, {
                        subSamplingOptions: info.subSamplingOptions,
                        aspects: aspects
                    });
            });
            content += buttonCreatePlot.renderHtml() + '<p>';
            var popupID = Popup.create(plottype.name+' aspects', content);
            controls.postCreateHtml();
        }

        return DataItemPlotPopup;
    });




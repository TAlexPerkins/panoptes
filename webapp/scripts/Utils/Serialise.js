// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "DQX/HistoryManager",
    "Wizards/EditQuery", "MetaData", "Plots/GenericPlot", "InfoPopups/ItemPopup",  "Utils/IntroViews"
],
    function (
        require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, HistoryManager,
        EditQuery, MetaData, GenericPlot, ItemPopup, IntroViews
        ) {

        var Serialise = {};





        Serialise.createLink = function() {
            var content =Serialise._store();
            var hostname=window.location.hostname;
            var pathname=window.location.pathname;
            var protocol=window.location.protocol;
            var portToken = '';
            if (window.location.port)
                if (window.location.port!=80)
                    portToken = ':'+window.location.port;
            DQX.serverDataStore(MetaData.serverUrl,content,function(id) {
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'view_store',
                    { database: MetaData.database, workspaceid:MetaData.workspaceid, id: id },
                    function(resp) {
                        var url='{protocol}//{hostname}{port}{pathname}?dataset={ds}&workspace={ws}&view={id}'.DQXformat({
                            protocol:protocol,
                            hostname:hostname,
                            port: portToken,
                            pathname:pathname,
                            ds:MetaData.database,
                            ws:MetaData.workspaceid,
                            id:id
                        });
                        var theState = null;
                        $.each(Application.getViewList(), function(idx, view) {
                            if (view.isActive())
                                theState = view.getStateID()
                        });
                        if (theState) {
                            url += '&state=' + theState;
                        }
                        var str='';
                        var edt = Controls.Textarea('', { size:80, linecount:4, value: url}).setHasDefaultFocus();
                        str += 'Permanent url to this view:<p>';
                        str += edt.renderHtml();
                        str += '<p>Press Ctrl+C to copy the url to the clipboard';

                        var btOpen = Controls.Button(null, {  content: 'Open in browser' }).setOnChanged(function() {
                            window.open(url,'_blank');
                        });
                        str += btOpen.renderHtml();

                        if (MetaData.isManager) {
                            var btCreateIntroView = Controls.Button(null, {  content: 'Add to start page' }).setOnChanged(function() {
                                IntroViews.createIntroView(url, id, theState);
                            });
                            str += btCreateIntroView.renderHtml();
                        }

                        str += '<p></p>';

                        Popup.create('Permanent link to view',str);

                    });
            });
        };


        Serialise.checkLoadView = function(proceedFunction) {
            var viewid  = DQX.getUrlSearchString('view');
            if (viewid) {
                DQX.customRequest(MetaData.serverUrl,PnServerModule,'view_get',
                    { id: viewid },
                    function(resp) {
                        if (DQX.getUrlSearchString('state')) {
                            HistoryManager.__preventSetFragment = true;
                            Application.activateView(DQX.getUrlSearchString('state'));
                            HistoryManager.__preventSetFragment = false;
                        }
                        Serialise._recall(resp.settings);
                        proceedFunction();
                    });
            }
            else
                proceedFunction();
        };


        Serialise._store = function() {
            var obj = {};
            obj.tableData = {};
            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                obj.tableData[tableInfo.id] = tableInfo.storeSettings();
            });
            obj.viewData = {};
            $.each(Application.getViewList(), function(idx,view) {
                if (view.storeSettings)
                    obj.viewData[view.getStateID()] = view.storeSettings();
            });
            obj.plotData = GenericPlot.store();
            obj.itemPopupData = ItemPopup.store();
            var st = JSON.stringify(obj);
            return Base64.encode(st);

        }

        Serialise._recall = function(settingsStr) {
            var st = Base64.decode(settingsStr);
            var obj = JSON.parse(st);

            if (obj.tableData) {
                $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                    if (obj.tableData[tableInfo.id])
                        tableInfo.recallSettings(obj.tableData[tableInfo.id]);
                });
            }

            $.each(Application.getViewList(), function(idx,view) {
                if ( (view.recallSettings) && (obj.viewData[view.getStateID()]) )
                    view.recallSettings(obj.viewData[view.getStateID()]);
            });
            if (obj.plotData)
                GenericPlot.recall(obj.plotData);

            if (obj.itemPopupData)
                ItemPopup.recall(obj.itemPopupData);

        }



        return Serialise;
    });



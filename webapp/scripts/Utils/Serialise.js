define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData"],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData) {

        var Serialise = {};





        Serialise.createLink = function() {
            var content =Serialise._store();
            DQX.serverDataStore(MetaData.serverUrl,content,function(id) {
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','view_store',
                    { database: MetaData.database, workspaceid:MetaData.workspaceid, id: id },
                    function(resp) {
                        url='file:///Users/pvaut/Documents/SourceCode/WebApps/panoptes/webapp/main.html?dataset={ds}&workspace={ws}&view={id}{hash}'.DQXformat({
                            ds:MetaData.database,
                            ws:MetaData.workspaceid,
                            id:id,
                            hash:window.location.hash
                        });
                        alert(url);
                    });
            });
        };


        Serialise.checkLoadView = function() {
            var viewid  = DQX.getUrlSearchString('view');
            if (viewid) {
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','view_get',
                    { id: viewid },
                    function(resp) {
                        Serialise._recall(resp.settings);
                    });
            }
        };


        Serialise._store = function() {
            var obj = {};
            obj.tableViewData = {};
            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                var tableView = Application.getView(tableInfo.tableViewId);
                obj.tableViewData[tableInfo.id] = tableView.storeSettings();
            })
            var st = JSON.stringify(obj);
            return Base64.encode(st);

        }

        Serialise._recall = function(settingsStr) {
            var st = Base64.decode(settingsStr);
            var obj = JSON.parse(st);
            $.each(MetaData.tableCatalog, function(idx, tableInfo) {
                var tableView = Application.getView(tableInfo.tableViewId);
                if (obj.tableViewData[tableInfo.id])
                    tableView.recallSettings(obj.tableViewData[tableInfo.id]);
            })
        }


        return Serialise;
    });


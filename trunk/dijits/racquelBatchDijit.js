dojo.provide("racquelDijits.racquelBatchDijit");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.Dialog");
dojo.require("dijit.layout.ContentPane");
dojo.require("dojox.data.CsvStore");
dojo.declare("racquelDijits.racquelBatchDijit",[dijit._Widget, dijit._Templated],{
	widgetsInTemplate:true,
	templatePath:dojo.moduleUrl("racquelDijits","templates/racquelBatchDijit.html"),
	
	constructor:function(params){
		this.toolbar = params.racquelToolbar;
		this._maxRows = 10; // not used yet
		this.osgb = new esri.SpatialReference({wkid:27700});
		this.batchSymbol = new esri.symbol.SimpleMarkerSymbol().setStyle(esri.symbol.SimpleMarkerSymbol.STYLE_X).setSize(12).setColor(new dojo.Color([255, 0, 255, 1])).setOutline(new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 1));
		this._idsUsed = [];
	},
	startup:function(){
		this.setupDropZone();
		dojo.connect(this._batchGoButton,"onClick",dojo.hitch(this,this.initiateBatchSearch));
		dojo.connect(this._batchCloseButton,"onClick",dojo.hitch(this,this.hideDialog));
		dojo.connect(this._batchCancelButton,"onClick",dojo.hitch(this,this.cancelSearch));
		dojo.style(this._BatchSearchDialog.closeButtonNode,"display","none");
	},
	setupDropZone:function(){
		if (!window.File || !window.FileReader){
			console.log("Browser doesn't support HTML5 drag / drop api");
			// Set up and return a content pane telling user to sort their browser out 
			//var errorDiv = 
		}
		else {
			var node = this._dropZone.domNode; // = set up a content pane that will be the drop zone
			dojo.connect(node,"dragenter",dojo.hitch(this,function(evt){
				evt.preventDefault();
				node.style.backgroundColor="yellow";
			}));
			dojo.connect(node,"dragover",dojo.hitch(this,function(evt){
				evt.preventDefault();
				node.style.backgroundColor="yellow";
			}));
			dojo.connect(node,"dragexit",dojo.hitch(this,function(evt){
				evt.preventDefault();
				node.style.backgroundColor="white";
			}));
			this._enableDrop();
		}
	},
	handleDrop:function(evt){
		console.log("Drop: ",evt);
		evt.preventDefault();
		var dataTransfer = evt.dataTransfer
		var files = dataTransfer.files;
		var types = dataTransfer.types;
		if (files && files.length ===1){
			console.log("Received files");
			var file = files[0];
			console.log("Type = ",file.type);
			if(file.name.indexOf(".csv")!==-1){
				this.handleCsv(file);
			}
		}
		else if (types){
			console.log("TYPES: ");
			console.log("  Length = ",types.length);
			dojo.forEach(types,function(type){
				if (type){
					console.log("  Type: ",type,", Data: ",dataTransfer.getData(type));
				}
			});
			var url;
            dojo.some(types, function(type){
                if (type.indexOf("text/uri-list") !== -1) {
                    url = dataTransfer.getData("text/uri-list");
                    return true;
                }
                else 
                    if (type.indexOf("text/x-moz-url") !== -1) {
                        url = dataTransfer.getData("text/plain");
                        return true;
                    }
                    else 
                        if (type.indexOf("text/plain") !== -1) {
                            url = dataTransfer.getData("text/plain");
                            url = url.replace(/^\s+|\s+$/g, "");
                            if (url.indexOf("http") === 0) {
                                return true;
                            }
                        }
                return false;
            });
            if (url) {
                if (url.match(/MapServer\/?$/i)) {
                    // ArcGIS Server Map Service?
                    handleMapServer(url);
                }
                else 
                    if (url.match(/(Map|Feature)Server\/\d+\/?$/i)) {
                        // ArcGIS Server Map/Feature Service Layer?
                        handleFeatureLayer(url);
                    }
            }
			
		}
	},
	handleCsv:function(file){
		var reader = new FileReader();
		reader.onload = dojo.hitch(this,function(){
			this.processCsvData(reader.result);
		});
		reader.readAsText(file);
	},
	processCsvData:function(data){
		// Check the data has the required attributes for the grid first here
		this.csvStore = new dojox.data.CsvStore({
			data:data
		});
		this.csvStore.fetch({
			onComplete: dojo.hitch(this,function(items,request){
				// build grid structure from the first item in the store
				// first get the attributes into an array
				var attrs = this.csvStore.getAttributes(items[0])
				var attributes=[];
				dojo.forEach(attrs,dojo.hitch(this,function(attr){
					attributes.push(attr);
				}));
				if (dojo.indexOf(attributes,"ID")==-1 ||
					dojo.indexOf(attributes,"X")==-1 ||
					dojo.indexOf(attributes,"Y")==-1 ||
					dojo.indexOf(attributes,"SITE")==-1 ||
					dojo.indexOf(attributes,"ROUTE")==-1 ||
					dojo.indexOf(attributes,"CATCHMENT")==-1){
						alert("Please check that the file you dropped contains all the required attributes!");
						return;
				}
				// now build the grid layout object. Not defined hardcoded because the user might have other attribs
				// in there too.
				var gridLayout = [[]];
				dojo.forEach(attributes,dojo.hitch(this,function(attr){
					var gridField = {
						field: attr,
						name: attr,
						width: "auto"
					}
					// NB width:"auto" is very naughty according to the dojo docs, reasoning being
					// that it needs the grid to read the entire store before rendering. That's a problem
					// if you've got millions of rows on a server but not for this use case.
					gridLayout[0].push(gridField);
				}));
				// set the grid to use it
				this._grid.setStructure(gridLayout);
				this._grid.setStore(this.csvStore,{});
				this._grid.domNode.style.visibility="visible";
				console.log("Processed CSV");
				this._batchGoButton.disabled=false;
			})
		});
		// Activate another for linking-sites searches ??
	},
	handleMapServer:function(url){
		console.log("Processing Mapserver: ", url);
		// Do a query on the corresponding mapserver layer to retrieve (what we assume will be) point features
		// Use these to populate the things-to-search grid
	},
	handleFeatureLayer:function(url){
		// As for mapserver
	},
	initiateBatchSearch:function(){
		// get each item from the store. for each of them make an input point from the coordinates and 
		// a searchid that is set here
		// pass each of these in turn to the racquelSearchDijit with some "noninteractive" flag set
		// results etc will all be stored and handled in the same way
		// while running disable everything except a cancel button
		this._disableDrop();
		this._batchGoButton.disabled=true;
		this._batchCloseButton.disabled=true;
		this._batchCancelButton.disabled=false;
		this._currentRow = 0;
		this._totalRows = this._grid.rowCount;
		// enable the search
		this.toolbar.racquelSearchDijit.enableSearch();
		// subscribe to the search being enabled, which the searchdijit will do at the end of a search
		// this will be our indication that it is time to run the next one, if any
		this._resultStoredSubscription = dojo.subscribe("racquelSearchEnabled",dojo.hitch(this,function(isEnabled){
			if (isEnabled) {
				this.runNextRow();
			}
		}));
		// and do the first one to get it all going
		this._searchIsCancelled = false;
		this.runNextRow();
	},
	runNextRow:function(){
		if (!this._searchIsCancelled) {
			if ((this._currentRow < this._totalRows)) {
				this._runRowSearch(this._currentRow);
				this._currentRow += 1;
			}
			else {
				this._searchesComplete();
			}
		}
		else {
			alert("Searches cancelled! /r/nSearch IDs can't be reused, "
				+"so you'll need new ones if you want to re-run.");
			this._batchCancelButton.disabled=true;
			this._batchCloseButton.disabled=false;
		}
	},
	_runRowSearch:function(rownum){
		this._grid.selection.select(rownum); // just to highlight it
		var storeitem = this._grid.getItem(rownum);
		// use the ID, X and Y fields to set up a search point graphic
		var x = this.csvStore.getValue(storeitem,"X",null);
		var y = this.csvStore.getValue(storeitem,"Y",null);
		var id = this.csvStore.getValue(storeitem,"ID",null);
		if (dojo.indexOf(this._idsUsed,id)!=-1){
			console.error("Error! Search ID "+id+" has already been used. A new id will be used instead");
			id = new Date().getTime();
		}
		else {
			// also check it's not in the resultStore from a previous run
			this._idsUsed.push(id);
		}
		var doSite = this.csvStore.getValue(storeitem,"SITE","YES");
		var doRoute = this.csvStore.getValue(storeitem,"ROUTE","YES");
		var doCatch = this.csvStore.getValue(storeitem,"CATCHMENT","NO");
		var searchPointGraphic,searchParams;
		if (x && y) {
			var searchPoint = new esri.geometry.Point(x,y,this.osgb);
			searchPointGraphic = new esri.Graphic(searchPoint,this.batchSymbol,{searchId:id});
		}
		if (doSite && doRoute && doCatch) {
			searchParams = new racquelDijits.racquelSearchSettings({
				serviceConfig: this.toolbar.racquelServiceConfig
			});
			searchParams.setSite(doSite === "YES");
			searchParams.setRoute(doRoute === "YES");
			searchParams.setCatchment(doCatch === "YES");
		}
		if (searchPoint && searchParams){
			this.toolbar.racquelSearchDijit.runSearch(searchPointGraphic,searchParams);
		}
		else {
			console.error("Problem parsing a row - skipped.");
		}
	},
	_searchesComplete:function(){
		// called when the rows have all been searched. Unsubscribe the run-next trigger. Re-enable things.
		dojo.unsubscribe(this._resultStoredSubscription);
		this._batchCancelButton.disabled=true;
		this._batchCloseButton.disabled=false;
		alert("Batch Searches Complete!");
		console.log("Batch Searches Complete!");
	},
	_disableDrop:function(){
		dojo.disconnect(this._fileDropConnection);
	},
	_enableDrop:function(){
		this._fileDropConnection = dojo.connect(this._dropZone.domNode,"drop",dojo.hitch(this,function(evt){
				this._dropZone.domNode.style.backgroundColor="white";
				this.handleDrop(evt);
		}));
	},
	initiateLinkingSearch:function(){
		// Need to write racquel Linking Search dijit
	},
	showDialog:function(){
		this._BatchSearchDialog.show();
	},
	hideDialog:function(){
		this._BatchSearchDialog.hide();
	},
	cancelSearch:function(){
		this._searchIsCancelled = true;
	}
	
});

dojo.provide("racquelDijits.racquelResultManager");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.Dialog");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.grid.cells.dijit");
dojo.require("dojo.data.ItemFileWriteStore");
dojo.require("dojox.layout.FloatingPane");
dojo.require("racquelDijits.racquelDataDescriptions");
dojo.declare("racquelDijits.racquelResultManager",[dijit._Widget,dijit._Templated],{
	widgetsInTemplate:true,
	constructor:function(params){
		params = params || {};
		// the widget can function without a map e.g. in the case of being used to display batch searches 
		if (!params.map){
			this.mapConnected = false;
		}
		else 
		{
			this.map = params.map;
			this._graphicsLayer = new esri.layers.GraphicsLayer();
			this.map.addLayer(this._graphicsLayer);
			this.mapConnected = false;
		}
		if((!params.displayMode )|| params.displayMode == "floating"){
			this.templateString = dojo.cache(dojo.moduleUrl("racquelDijits","templates/racquelResultManager_floating.html"));
			this.floating=true;
		}
		else{
			this.templateString = dojo.cache(dojo.moduleUrl("racquelDijits","templates/racquelResultManager_fixed.html"))
			this.floating=false;
		}
		//this._VisibleSearchList=[];
		this.toolbar = params.racquelToolbar;
	},
	startup:function(){
		this._grid.startup();
		//dojo.connect(this._grid,"onMouseOverRow",dojo.hitch(this,this._gridRowHoverHandler));
		//dojo.connect(this._grid,"onMouseOutRow",dojo.hitch(this,this._gridRowHoverOutHandler));
		dojo.connect(this._btnSelectAll,"onClick",dojo.hitch(this,this._selectAll));
		dojo.connect(this._btnSelectNone,"onClick",dojo.hitch(this,this._selectNone));
		dojo.connect(this._btnDeleteSelected,"onClick",dojo.hitch(this,this._deleteSelected));
		dojo.connect(this._btnZoomSelected,"onClick",dojo.hitch(this,this._zoomSelected));
		dojo.connect(this._btnSaveSelected,"onClick",dojo.hitch(this,this._saveSelected));
		dojo.connect(this._btnExportSelected,"onClick",dojo.hitch(this,this._exportSelected));
		if(this.floating){
			this.floatingWindow.startup();
			// the floating pane sets its natural state from its domNode at startup. But it doesn't seem
			// to work right with the natural width and height being set to 0. This causes the children
			// to be resized to zero if the pane's resize is called. Bodge to override it by getting the actual 
			// sizes (assuming it's visible!)
			//this.fwSize = this._getSize(this.floatingWindow.domNode);
			this.fwSize = dojo.coords(this.floatingWindow.domNode);
			this.floatingWindow._naturalState = this.fwSize;
		}
		// listen out for a search result being stored (by search dijit, into toolbar's resultstore). 
		// When there is one, retrieve it and show it
		dojo.subscribe("racquelResultStored",dojo.hitch(this,function(searchId){
			this._addResultToGrid(searchId);
		}));
		// listen out for the toolbar's resultstore being cleared. Clear this to match. 
		dojo.subscribe("racquelResultsCleared",dojo.hitch(this,function(){
			this._clearAllResults();
		}));
		// listen out for a result being removed from the toolbar's resultstore. Find it and remove it here.
		dojo.subscribe("racquelResultCleared",dojo.hitch(this,function(searchId){
			this._removeResultFromGrid(searchId);
		}));
		// Set up the grid's datastore. 
		var data = {
			identifier:"SearchId",
			label:"RIVER",
			items:[]
		};
		this.store = new dojo.data.ItemFileWriteStore({data:data});
		this._grid.setStore(this.store);
		this._grid.setQuery({});
		// load the grid with anything that's already in the resultStore at startup (persisted from earlier session)
		var existingSearches = this.toolbar.racquelResultStore.getSearchIds();
		dojo.forEach(existingSearches, dojo.hitch(this,function(searchIdx){
			this._addResultToGrid(searchIdx);
		}));
	},
	postCreate:function(){
		// ensure that the grid's formatter functions (to make checkboxes etc) execute in the scope of this
		// widget
		this._grid.attr("formatterScope",this);
	},
	_addResultToGrid:function(searchId){
		// A result has been stored in the toolbar. This method 
		// will be called with a searchId. Retrieve the corresponding object and format it for the grid
		var racquelResultItem = this.toolbar.racquelResultStore.getWholeResult(searchId);
		var siteExists=null,routeExists=null,catchExists=null;
		if (racquelResultItem.hasOwnProperty('siteResult')){
			siteExists = racquelResultItem.siteResult.successful;
		}
		if (racquelResultItem.hasOwnProperty('routeResult')){
			routeExists = racquelResultItem.routeResult.successful;
		}
		if (racquelResultItem.hasOwnProperty('catchResults')){
			catchExists = racquelResultItem.catchResults.successful;
		};
		var riverName = "N/A"
		var searchLocation = racquelResultItem.searchLocation;
		if (routeExists) {
			riverName = racquelResultItem.routeResult.riverSegment.attributes["OS_NAME"];
		}
		// ..Exists variables are null for not done, true for successful, false for error
		var newjson = {
			River: 		riverName,
			SearchId:	searchId,
			Location:		searchLocation, // will be displayed via formatter function
			Site:		siteExists,
			Route:		routeExists,
			Catchment:	catchExists,
			Show:		false
		}
		console.log("adding item to grid "+newjson);
		this.store.newItem(newjson);
		//this._grid.render();
		this.store.save();
	},
	_clearAllResults:function(){
		// delete all rows from the grid and all graphics from the map
		if (this._graphicsLayer){
			this._graphicsLayer.clear();
		}
		var data = {
			identifier:"SearchId",
			label:"RIVER",
			items:[]
		};
		this.store = new dojo.data.ItemFileWriteStore({data:data});
		this._grid.setStore(this.store);
		this._grid.setQuery({});
	},
	_removeResultFromGrid:function(searchId){
		// remove the row corresponding to searchId from the grid, and associated graphics from the map
		// DO NOT call directly in this widget. This widget's delete controls act on the toolbar's result store
		// and this method will then be called in response to the change there.
		this._showHideResults(searchId,true);//remove from map, if showing
		this.store.fetch({query:{'SearchId':searchId},onComplete:dojo.hitch(this,function(items){
			var item = items[0];
			this.store.deleteItem(item);
			this.store.save();
		})});
	},
	_getGridCheckBox:function(storeitemfield){
		// formatter function to create checkbox to select a grid row for deletion (future: export), etc
		// NOT USED
		var cb = new dijit.form.CheckBox({
			name:"checkBox",
			value:"blah",
			cbid:storeitemfield,
			checked:false,
			title:"Mark for export",
			className:"racquelIdCheckBox"
		},"checkBox");
		return cb;
	},
	_getGridCoords:function(storeitemfield){
		// formatter function to extract and concatenate into a single string the search coordinates
		// this function receives only one field from the store item (field is named in template)
		var x = Math.round(storeitemfield.geometry.x);
		var y = Math.round(storeitemfield.geometry.y);
		return x+","+y;
	},
	_getGridYesNoText:function(storeitemfield){
		// formatter function to write Yes or No instead of true/false in the site/route/catchment columns
		if (storeitemfield !== null) {
			if (storeitemfield == true) {
				return "Yes";
			}
			else {
				return "Error!";
			}
		}
		else {
			return "No";
		}
	},
	_getGridShowHideBox:function(storeitem){
		// formatter function to create checkbox to add / remove a search result from the map
		// this function receives the whole store item (field is defined in template as _item), 
		// not just a field.
		if (storeitem.Route[0] || storeitem.Catchment[0]){
		var cb = new dijit.form.CheckBox({
			name:"checkBox",
			value:"blah",
			checked: storeitem.Show[0], // will always not be shown initially
			onChange: dojo.hitch(this,function(){
				this._showHideResults(storeitem.SearchId[0]);
			}),
			title: "Show / hide these results on the map"
		}, "checkBox");
		return cb;
		}
		else{
			return "<span title='No graphical results (route or catchment) retrieved'>N/A</span>";
		}
	},
	_getShowDetailsButton:function(searchId){
		// formatter function to make button to show details of search
		var button = new dijit.form.Button({
			label:"Show!",
			onClick:dojo.hitch(this,function(){
				this._showSearchDetails(searchId);
			})
		});
		button.startup();
		return button;
	},
	_getZoomToButton:function(searchId){
		var button = new dijit.form.Button({
			label:"Zoom",
			onClick:dojo.hitch(this,function(){
				this._zoomSelected([searchId]);
			})
		});
		button.startup();
		return button;
	},
	_showHideResults:function(searchId,onlyHide){
		// handle change of a checkbox to add or remove associated search graphics on the map 
		var showing = false;
		dojo.some(this._graphicsLayer.graphics,dojo.hitch(this,function(graphic){
			if ((graphic.attributes) && graphic.attributes.searchId == searchId)
			{
				showing = true; 
				return true;
			} 
		}));
		// onlyHide enables this function to be called to remove a graphic only, not add it
		// This is used when a result is deleted - we want to remove it from the map if present, or take no action if not
		if (!showing && !onlyHide) {
			// Graphics are not showing, and we do want to add them
			var racquelResultItem = this.toolbar.racquelResultStore.getWholeResult(searchId);
			//var siteExists = racquelResultItem.hasOwnProperty('siteResult');
			//var routeExists = racquelResultItem.hasOwnProperty('routeResult');
			this._graphicsLayer.add(racquelResultItem.searchLocation.setAttributes({"searchId":searchId}).
									setSymbol(this.toolbar.racquelMapSymbols.searchPointSymbol));					
			if (racquelResultItem.hasOwnProperty('catchResults') && racquelResultItem['catchResults'].successful == true)
			{
				var catchGraphic = racquelResultItem['catchResults'].catchment;
				catchGraphic.setSymbol(this.toolbar.racquelMapSymbols.catchmentSymbol);
				this._graphicsLayer.add(catchGraphic);
			}
			if (racquelResultItem.hasOwnProperty('routeResult') && racquelResultItem['routeResult'].successful == true)
			{
				var item = racquelResultItem['routeResult'];
				this._graphicsLayer.add(item.sourceRoute.setAttributes({"searchId":searchId}).
										setSymbol(this.toolbar.racquelMapSymbols.sourceRouteSymbol));
				this._graphicsLayer.add(item.mouthRoute.setAttributes({"searchId":searchId}).
										setSymbol(this.toolbar.racquelMapSymbols.mouthRouteSymbol));
				this._graphicsLayer.add(item.source.setAttributes({"searchId":searchId}).
										setSymbol(this.toolbar.racquelMapSymbols.sourceSymbol));
				this._graphicsLayer.add(item.mouth.setAttributes({"searchId":searchId}).
										setSymbol(this.toolbar.racquelMapSymbols.mouthSymbol));
				this._graphicsLayer.add(item.riverSegment.setAttributes({"searchId":searchId}).
										setSymbol(this.toolbar.racquelMapSymbols.riversSymbol));
				this._graphicsLayer.add(item.netLocation.setAttributes({"searchId":searchId}).
										setSymbol(this.toolbar.racquelMapSymbols.locatedPointSymbol));					
			}
		}
		else
		{
			// either onlyHide was true, or the graphics are already showing, or both
			// either way we want to remove the graphics from the map. If they aren't there, then nothing will
			// happen.
			// can't use forEach to iterat over the whole graphics set and remove in situ as the indexes change
			// when one is removed so it breaks.
			var graphicsToRemove = dojo.filter(this._graphicsLayer.graphics,dojo.hitch(this,function(graphic){
				return graphic.attributes['searchId']==searchId;
			}));
			dojo.forEach(graphicsToRemove,dojo.hitch(this,function(graphic){
					this._graphicsLayer.remove(graphic);
			}));
		}
	},
	_showSearchDetails:function(searchId){
		var racquelResultItem = this.toolbar.racquelResultStore.getWholeResult(searchId);
		var siteExists=null,routeExists=null,catchExists=null;
		if (racquelResultItem.hasOwnProperty('siteResult')){
			siteExists = racquelResultItem.siteResult.successful;
		}
		if (racquelResultItem.hasOwnProperty('routeResult')){
			routeExists = racquelResultItem.routeResult.successful;
		}
		if (racquelResultItem.hasOwnProperty('catchResults')){
			catchExists = racquelResultItem.catchResults.successful;
		};
		// now the ..exists are true / false for success, or null if not done
		var riverName = "N/A"
		var searchLocation = racquelResultItem.searchLocation;
		if (routeExists) {
			riverName = racquelResultItem.routeResult.riverSegment.attributes["OS_NAME"];
		}
		var summaryTxt;
		if (riverName=="N/A") {
			summaryTxt = "Results of search at "
		}
		else {
			summaryTxt = "Results of search on "+riverName+" at "
		}
		summaryTxt = summaryTxt + this._getGridCoords(searchLocation);
		var resultPane = new dijit.layout.ContentPane({
			title:				riverName,
			doLayout:			true,
			className: "racquelResultPane",
			id:					"racquelResultPane"+searchId 
		});
		var summaryDiv = dojo.create('div',{innerHTML:summaryTxt},resultPane.domNode);		
		if (routeExists !== null){
			resultPane.domNode.appendChild(this._formatReachResult(racquelResultItem['routeResult']['riverSegment']));
		}
		if (siteExists !== null) {
			resultPane.domNode.appendChild(this._formatSiteResult(racquelResultItem['siteResult']));
		}
		if (routeExists !== null) {
			resultPane.domNode.appendChild(this._formatRouteResult(racquelResultItem['routeResult']));
		}
		if (catchExists !== null) {
			//if (routeExists !== null) {
				//resultPane.domNode.appendChild(this._formatCatchResult(racquelResultItem['catchResults'],
					//racquelResultItem['routeResult']['source']));
			//}
			//else {
				resultPane.domNode.appendChild(this._formatCatchResult(racquelResultItem['catchResults']));
			//}
		}
		var okButton = new dijit.form.Button({
			label:"OK",
			onClick: dojo.hitch(this,function(){
				dialog.destroyRecursive();
			})
		});
		okButton.startup();
		dojo.place(okButton.domNode,resultPane.domNode,"last"); 
		
		resultPane.startup();
		var dialog = new dijit.Dialog({
			title: "Result details",
			content: resultPane,
			refreshOnShow:true,
			onCancel:function(){
				this.destroyRecursive();
			},
			className: "racquelResultPane",
			autofocus: !dojo.isIE,
			refocus: !dojo.isIE
		});
		dialog.startup();
		dialog.show();
	},
	_formatReachResult:function(riverReachGraphic){
		var contents = "Selected river reach:<br/>";
		if (riverReachGraphic.attributes.hasOwnProperty('STRAHLER')){
			contents += "Strahler stream order:  " + riverReachGraphic.attributes['STRAHLER'] +"<br/>";
		}
		if (riverReachGraphic.attributes.hasOwnProperty('SHREVE')){
			contents += "Shreve stream order:  " + riverReachGraphic.attributes['SHREVE']+"<br/>";
		}
		if (riverReachGraphic.attributes.hasOwnProperty('WORK_')){
			contents += "Capital works:  " + riverReachGraphic.attributes['WORK_'];
			if (riverReachGraphic.attributes['WORK_']==="Capital"){
				contents += " (" + riverReachGraphic.attributes['WORKTYPE']+")";
			}	
		}
		var div = dojo.create("div",{innerHTML:contents});
		return div;
	},
	_formatSiteResult:function(siteResultItem){
		var contents = "<H3>At-site results</H3>";
		if (!siteResultItem.successful){
			contents += "At site searches were not successful!"
		}
		else {
			contents += "<table border ='1'><tr><th>Layer</th><th>Site value</th></tr>";
            for (var i in siteResultItem.results)
			{
				if (siteResultItem.results.hasOwnProperty(i)){
					contents += "<tr><td>" + i + "</td><td>" + siteResultItem.results[i] + "</td></tr>";
				}
			}
			contents += "</table>";
		}
		var div = dojo.create("div",{
			innerHTML:contents,
			className:"racquelResultSection"});
		return div;
	},
	_formatRouteResult:function(routeResultItem){
		var contents = "<H3>River routing results</H3>";
		if (!routeResultItem.successful){
			contents += "River searches were not successful!"
		}
		else {
			var searchPt = routeResultItem.searchLocation.geometry;
			var locPt = routeResultItem.netLocation.geometry;
			var distance = Math.sqrt((searchPt.x - locPt.x)*(searchPt.x-locPt.x)+(searchPt.y-locPt.y)*(searchPt.y-locPt.y));
			contents += "Input location was snapped to on-channel location of "+Math.round(locPt.x) + "," + Math.round(locPt.y)+"<br/>";
			contents += "This is "+Math.round(distance)+"m from the input location.";
			contents += "<table border ='1'><tr><th>Route attribute</th><th>Value</th></tr>";
    		contents += "<tr><td>Distance from source (km)</td><td>" + Math.round((routeResultItem.sourceRoute.attributes.Total_length/1000)*1000)/1000 + "</td></tr>";
    		contents += "<tr><td>Source location</td><td>" + Math.round(routeResultItem.source.geometry.x) + "," + Math.round(routeResultItem.source.geometry.y) + "</td></tr>";
    		contents += "<tr><td>Distance to mouth (km)</td><td>" + Math.round((routeResultItem.mouthRoute.attributes.Total_length/1000)*1000)/1000 + "</td></tr>";
    		contents += "<tr><td>Mouth location</td><td>" + Math.round(routeResultItem.mouth.geometry.x) + "," + Math.round(routeResultItem.mouth.geometry.y) + "</td></tr></table>";
    	}
		var div = dojo.create("div",{
			innerHTML:contents,
			className:"racquelResultSection"
		});
		return div;
	},
	_formatCatchResult:function(catchResultItem){
		var contents = "<H3>Catchment definition results</H3>";
		if (!catchResultItem.successful) {
			contents += "Catchment definition / extraction was not successful!"
		}
		else {
			var data = catchResultItem["extractedData"];
			var describer = new racquelDijits.racquelDataDescriptions();
			// need to work with the "fixed" list of available parameters as opposed to what is currently
			// set for extraction in the searchSettings as this could have been changed since the search was run
			var config = this.toolbar.racquelServiceConfig.racquelCatchmentService;
			for (var defaultParam in config["DefaultOutputParams"]){
				if (data.hasOwnProperty(defaultParam) && defaultParam.type === "Literal"){
					// catchment area is in data[defaultParam]
					//Math.round((catchResultItem.catchment.attributes.area / 1000000) * 100) / 100;
					//contents += "Catchment area is " + catchArea + "sq km.<br/>";
				}
			} 
			// QC catchment here for now. Needs to move to search dijit so it works with batch search.
			if (catchResultItem.catchmentQC){
				if (catchResultItem.catchmentQC == "QC_OK"){
					contents += "QC: OK (Source point is within catchment)<br/>";
				}
				else{
					contents += "QC: WARNING! Source point is not within catchment. Please check visually<br/>";
				}
			}
			else{
				contents += "QC: Catchment not quality controlled as route search was not done or not successful<br/>";
			}
			// now do those in AvailableExtractionParams
			// we're not sorting them - they may not always appear in same order. easy enough to sort if 
			// anyone moans though
			for (var possibleParamName in config["AvailableExtractionParams"]){
				if (data.hasOwnProperty(possibleParamName)){
					var parameterDetails = config["AvailableExtractionParams"][possibleParamName];
					if (parameterDetails.type === "Literal"){
						contents += parameterDetails["name"]+": ";
						contents += (Math.round((data[possibleParamName])*1000)/1000) + "<br/>"; 
					}
					else if (parameterDetails.type === "Continuous"){
						contents += "<h4>" + parameterDetails["name"] + "</h4>";
						var max = Math.round(((data[possibleParamName]["Max"])/10)*10)/10;
						var min = Math.round(((data[possibleParamName]["Min"])/10)*10)/10;
						var mean = Math.round(((data[possibleParamName]["Mean"])/10)*10)/10;
						contents += "Maximum: "+max+ "<br/>";
						contents += "Minimum: "+min+ "<br/>";
						contents += "Average: "+mean+"<br/>";
					}
					else if (parameterDetails.type === "Categorical"){
						contents += "<table border='1'><tr><th colspan=2>" + parameterDetails["name"] + "</th></tr>";
						var classes = describer.lcm2k.classes;
						for (var dataClass in data[possibleParamName]){
							if (data[possibleParamName].hasOwnProperty(dataClass)){
								// round if necessary 
								var value = Math.round((data[possibleParamName][dataClass])*100)/100;
								contents += "<tr><td>";
								contents += "Class "+dataClass+ " ("+ classes[dataClass] + ")</td>";
								contents += "<td>" + value + "%</td></tr>";
							}
						}
						contents += "</table>";
					}
				}
			}
			
		}
		var div = dojo.create("div",{
			innerHTML:contents,
			className:"racquelResultSection"
		});
		return div;
	},
	_zoomSelected:function(searchIdsArray){
		// get the selected results and zoom to their extent
		// Not relevant if we are not connected to a map. Should make the button programatically only if a 
		// map is connected
		var graphicsToZoom = [];
		dojo.forEach(searchIdsArray,dojo.hitch(this,function(searchId){
			var racquelResultItem = this.toolbar.racquelResultStore.getWholeResult(searchId);
			if (racquelResultItem.hasOwnProperty('routeResult') && racquelResultItem['routeResult'].successful == true)
			{
				var item = racquelResultItem['routeResult'];
				graphicsToZoom.push(item.sourceRoute);
				graphicsToZoom.push(item.mouthRoute);
				graphicsToZoom.push(item.source);
				graphicsToZoom.push(item.mouth);
			}
			else if (racquelResultItem.hasOwnProperty('catchResults') && racquelResultItem['catchResults'].successful == true)
			{
				var catchGraphic = racquelResultItem['catchResults'].catchment;
				graphicsToZoom.push(catchGraphic);
			}
			else if (racquelResultItem.hasOwnProperty('searchLocation'))
			{
				graphicsToZoom.push(racquelResultItem.searchLocation);	
			}
		}));
		if(graphicsToZoom.length > 0){
			this._zoomToGraphics(graphicsToZoom);			
		}
	},
	_selectAll:function(){
		// select all result rows checkboxes
		console.log("Select all");
		this._grid.selection.selectRange(0,this._grid.rowCount-1);
		// or select all result rows checkboxes - NOT USING
		//var inputs = dojo.query(".racquelIdCheckBox");
		//dojo.forEach(inputs,dojo.hitch(this,function(input){
		//	var checkboxwidget = dijit.getEnclosingWidget(input);
		//	if (!checkboxwidget.checked){
		//		checkboxwidget.checked=true;
		//	}
		//}));
	},
	_selectNone:function(){
		// deselect all result rows
		console.log("Clear selection");
		this._grid.selection.clear();
	},
	_deleteSelected:function(){
		// get the selected results and delete them from the result store. This will in turn trigger removing
		// them from the grid 
		//Remove from map, if showing.
		console.log("delete selected");
		//var list = this._getSelected(); // <- this for home-brew selection checkboxes, returns list of ids
		var selected = this._grid.selection.getSelected(); // <- this for the grids native row selection, returns store items
		var selectedIds = [];
		dojo.forEach(selected,dojo.hitch(this,function(item){
			if(item && item.SearchId){
				selectedIds.push(item.SearchId);
			}
		}));
		console.log("deleting "+selectedIds.length+" results");
		dojo.forEach(selectedIds,dojo.hitch(this,function(item){
			if (item) {
				this.toolbar.racquelResultStore.deleteResult(item);
			}
		}));
	},
	_saveSelected:function(){
		// Trigger for functionality to save selected results into a session state so they can be 
		// reloaded on next visit to the page
		// Will use browser localStorage (HTML5 -> not IE) to store the main resultStore contents
		// alert("This will save selected results so they're still here next time you visit. Still to be developed!");
		// CURRENTLY NOT USED - ALL ARE SAVED AUTOMATICALLY ON PAGE UNLOAD
	},
	_exportSelected:function(){
		// Trigger for functionality to export selected results to a shapefile.
		// The shapefile is generated entirely in the browser using binary HTML5 spec, or emulation classes
		// in non-compatible browsers. No server side faff. 
		
		// Uses JS2Shapefile library, written by me as separate package not using dojo
		// Therefore load it using dojo.io.script.get rather than dojo.require
		// JS2Shapefile needs to create and save binary data in the browser which can only be done where 
		// BlobBuilder, DataView, and File API are implemented. 
		// Only Chrome does all these and some people still insist on not using it. So, to support other 
		// browsers, wrap all this functionality into a separate BinaryHelper class, 
		// also loaded via dojo.io.script.get 
		// This in turn loads whatever helper bits the current browser requires, using script tag insertion.
		// (because dojo is not necessarily present in applications using this class).
		 
		// A shapefile is created for each of points, lines, and polygons and the features in each contain
		// all the attributes found in any of the input graphics
		
		// Simpler export methods could consist of:
		// - formatting results into flat csv format and download via server pingback
		// - formatting results into flat csv format and display in dialog to copy/paste
		// - sending results to server, returning a zipped shapefile for each of site, route, and catchment results
		// (one feature in each for each search). This needs an SOE to be writen to handle this
		
		// First load the js2shapefile library and the filesavetools library
		var tmp = [];
		tmp.push(this.toolbar.loadExternalScript('../js2shapefile/src/JS2Shapefile.js', 'Shapefile'));
		
		// The BinaryHelper class contains tools for generating and saving binary data. These include 
		// a BlobBuilder polyfiller class to allow pseudo-blob generation in IE, so it is required by the 
		// shapefile library. It also includes tools to save these Blobs to disk either natively or via
		// a flash helper in browsers without File API (anything but Chrome) 
		tmp.push(this.toolbar.loadExternalScript('../js2shapefile/lib/FileSaveTools.js', 'BinaryHelper'));
		
		// BinaryHelper itself loads the jDataView_write library. This is currently a requirement of the JS2Shapefile class - 
		// it is a polyfiller for browsers which do not implement DataView. Since only Chrome currently does
		// the library has been written with the assumption that it's probably not available and relies on 
		// the polyfiller. (The polyfiller uses native DataView if it's available so the only cost is the script 
		// load.) 
		
		// tmp is now an array of 2 Dojo.Deferreds, which will be resolved when the objects called 
		// "Shapefile" and "BinaryHelper" are defined. (The latter will occur only when jDataView_write and other
		// subsidiaries are also available).
		
		// We will make a DeferredList from it shortly so that we don't continue until everything is available,
		// but first add one more to represent whether the user wants to continue or not, which is set 
		// in response to a dojo Dialog giving some bumph about what will happen next. 
		// This isn't modal, so execution will continue as the user reads its content, but only
		// by clicking OK will the DeferredList tmp be resolved, prompting the call to ExportGraphics.
		// Handily this provides some cover for the delay while the other scripts are downloaded.
		var okToContinue = new dojo.Deferred();
		tmp.push(okToContinue);
		var saveDialogContent = new dijit.layout.ContentPane({
			title:				"Save Results to Shapefile",
			doLayout:			true,
			className: "saveDialogPane",
			id:			"saveIntroPane" 
		});
		var summaryDiv = dojo.create('div',{
			innerHTML: "This will export selected results to shapefiles. It works best in Google Chrome<br/>"+ 
			"(as do most things). <br/><br/>"+
			"Other browsers should work if you have Flash installed but there<br/>"+ 
			"may be a short pause during which your browser appears unresponsive,<br/>"+ 
			"whilst the shapefile(s) are created. This may cause your browser to show a <br/>"+
			"'Script Unresponsive' message - please choose continue, if so."+
			"If this is a problem, please upgrade your browser."
		},saveDialogContent.domNode);		
		saveDialogContent.startup();
		var dialog = new dijit.Dialog({
			title: "Save Results to Shapefile",
			content: saveDialogContent,
			refreshOnShow:true,
			onCancel:function(){
				this.destroyRecursive();
			},
			className: "racquelResultPane",
			autofocus: !dojo.isIE,
			refocus: !dojo.isIE
		});
		var okButton = new dijit.form.Button({
			label: 'Create Shapefiles',
			onClick: function(){
				okToContinue.resolve();
				dialog.onCancel();
			},	
		})
		var cancelButton = new dijit.form.Button({
			label: 'Cancel',
			onClick:function(){
				// okToContinue.cancel ??
				dialog.onCancel();
			}
		})
		okButton.startup();
		cancelButton.startup();
		saveDialogContent.domNode.appendChild(okButton.domNode);
		saveDialogContent.domNode.appendChild(cancelButton.domNode);
		
		dialog.startup();
		dialog.show();
		
		// Now get all the graphics associated with the selected search records (this will happen while the
		// dialog is showing and the export scripts are downloading)
		var selected = this._grid.selection.getSelected(); // <- this for the grids native row selection, returns store items
		var selectedIds = [];
		dojo.forEach(selected,dojo.hitch(this,function(item){
			if(item && item.SearchId){
				selectedIds.push(item.SearchId);
			}
		}));
		var graphicsToExport = [];
		dojo.forEach(selectedIds,dojo.hitch(this,function(item){
			if (item) {
				// convert the result object into an array of graphics each with appropriate attributes
				try {
					var graphicsFromSearch = this.toolbar.racquelResultStore.getResultAsAttributedGraphics(item);
					// this will be an array containing the graphics, we want to put the individual items, rather than  
					// the array itself, onto the export array
					dojo.forEach(graphicsFromSearch, dojo.hitch(this, function(graphic){
						graphicsToExport.push(graphic);
					}));
				}
				catch (err){
					console.log("Problem with search id "+item+" - will not be exported");
				}
			}
		}));
		
		if (tmp.length > 0) {
			var dl = new dojo.DeferredList(tmp);
			dl.then(dojo.hitch(this, function(){
				// exportGraphics generates the shapefile. So it is called only after the libraries are loaded.
				this.exportGraphics(graphicsToExport);
			}));
		}
		else {
			this.exportGraphics(graphicsToExport);
		}
	},
	exportGraphics:function(graphics){
		// Method which actually generates and provides interface to save the shapefile. Called by
		// _exportSelected when the required libraries have been loaded.
		var shapewriter = new Shapefile();
		// we can add an array of graphics of mixed geometry types...
		shapewriter.addESRIGraphics(graphics);
		// and then retrieve shapefiles which contain only the relevant geometry types
		var outputObject = {
			points: shapewriter.getShapefile("POINT"),
			lines: shapewriter.getShapefile("POLYLINE"),
			polygons: shapewriter.getShapefile("POLYGON")
		}
		// each of these objects returned from getShapefile contains an attribute 'successful' and if that's true,
		// another attribute 'shapefile' containing the actual shapefile data represented as a sub-object 
		// containing three attributes called dbf,shp,shx, the values of which are BlobBuilders
		// BinaryHelper.addData takes input as an object containing properties 'filename', 'extension' and 
		// 'datablob'
		var saver = new BinaryHelper();
		var anythingToDo = false;
		for (var shapefiletype in outputObject){
			if (outputObject.hasOwnProperty(shapefiletype)){
				if (outputObject[shapefiletype]['successful']){
					anythingToDo = true;
					for (actualfile in outputObject[shapefiletype]['shapefile']){
						if (outputObject[shapefiletype]['shapefile'].hasOwnProperty(actualfile)){
							saver.addData({
								filename: "racquel_results_"+shapefiletype,
								extension: actualfile,
								datablob: outputObject[shapefiletype]['shapefile'][actualfile]
							});
						}
					}
				}
			}
		}
		
		// The fileSaver is now loaded and ready to go. If it's a native one (Chrome) then we could at this point
		// call _saveNative to save the data directly to disk. But if it's flash-based then the actual disk write
		// needs to be a direct response to user interaction (flash limitation) so need to generate a button
		// for the user to click. Do this in Chrome too for consistency - but in Chrome it will be a normal
		// button rather than a flash lookalike.
		var saveDialogContent = new dijit.layout.ContentPane({
			title:				"Export Results",
			doLayout:			true,
			className: "saveDialogPane",
			id:			"saveDialogPane" 
		});
		var summaryDiv = dojo.create('div',{innerHTML:"Click the button to save results"},saveDialogContent.domNode);		
		saveDialogContent.startup();
		var dialog = new dijit.Dialog({
			title: "Save results",
			content: saveDialogContent,
			refreshOnShow:true,
			onCancel:function(){
				this.destroyRecursive();
			},
			className: "racquelResultPane",
			autofocus: !dojo.isIE,
			refocus: !dojo.isIE
		});
		dialog.startup();
		dialog.show();
		saver.createSaveControl("saveDialogPane",true);
	},
	
	_getSelected:function(){
		// Utility function to query checkboxes to get the results corresponding to checked boxes
		// NOT USED
		var inputs = dojo.query(".racquelIdCheckBox");
		var checkedlist = [];
		dojo.forEach(inputs,dojo.hitch(this,function(input){
			var checkboxwidget = dijit.getEnclosingWidget(input);
			if (checkboxwidget.checked){
				checkedlist.push(checkboxwidget.cbid); // TODO make it have one!
			}
		}));
		return checkedlist;
	},
	_saveToLocalStorage:function(){
		// save the contents of the toolbar's result store corresponding to the 
		// checked grid lines to browser localStorage.
		// check if there are already racquelResults stored there and offer to append or overwrite 
	},
	_loadFromLocalStorage:function(){
		// populate the toolbar's result store (and thus the grid) with results from the browser
		// localStorage
	},
	_zoomToGraphics:function(graphics){
		var extent = this._getGraphicsExtent(graphics);
		if(extent && this.map){
			extent.expand(1.1);
			this.map.setExtent(extent,true);
		}
	},
	_getGraphicsExtent:function(graphics){
		var geometry,extent,ext;
		dojo.forEach(graphics,dojo.hitch(this,function(graphic,i){
			geometry = graphic.geometry;
			if (geometry instanceof esri.geometry.Point){
				ext = new esri.geometry.Extent(geometry.x - 1, geometry.y - 1, 
												geometry.x + 1, geometry.y + 1, 
												geometry.spatialReference);
			}
			else {
				if (geometry instanceof esri.geometry.Extent){
					ext=geometry;
				}
				else {
					ext = geometry.getExtent();
				}
			}
			if (extent){
				extent = extent.union(ext);
			}
			else {
				extent = new esri.geometry.Extent(ext);
			}
		}));
		return extent;	
	}
	
});

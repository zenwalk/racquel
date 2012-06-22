dojo.provide("racquelDijits.racquelResultManager");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.Dialog");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.grid.cells.dijit");
dojo.require("dojo.data.ItemFileWriteStore");
dojo.require("dojox.layout.FloatingPane");
dojo.require("dijit.layout.TabContainer");
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
		// define a text formatting function on string prototype (used to format field names from capitals)
		if (!String.prototype.toProperCase) {
			String.prototype.toProperCase = function(){
				return this.replace(/\w\S*/g, function(txt){
					return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
				});
			};
		}	
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
			dojo.connect(this.floatingWindow,"onShow",dojo.hitch(this,this._refreshChecks));
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
		//this._refreshChecks();
	},
	_refreshChecks:function(){
		// checkboxes seemingly often get cleared so they get out of sync with what's on the map
		// call this every time something that seems to trigger this behaviour occurs 
		console.log("restored floatingwindows");
		var mapCheckBoxes = dojo.query(".racquelResultShowMapCB");
		var currentShowingGraphicIds = dojo.map(this._graphicsLayer.graphics,dojo.hitch(this,function(graphic){
			return graphic.attributes['searchId'];
		}));
		dojo.forEach(mapCheckBoxes,dojo.hitch(this,function(checkBoxInnards){
			var checkBox = dijit.getEnclosingWidget(checkBoxInnards);
			var srchId = checkBox.id.replace("cbMapResult_","");
			if (currentShowingGraphicIds.indexOf(srchId)===-1){
				checkBox.set('checked',false);
			}
			else {
				checkBox.set('checked',true);
			}
		}));
		// checkboxes do not stay in sync with what is on the map
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
			onChange: dojo.hitch(this,function(checkedState){
				this._showHideResults(storeitem.SearchId[0]);
				this.store.setValue(storeitem,"Show",checkedState);
				//storeitem.Show[0] = this.checked;
			}),
			title: "Show / hide these results on the map",
			//id:"cbMapResult_"+storeitem.SearchId[0]
		}, "checkBox");
		//dojo.addClass(cb.domNode,"racquelResultShowMapCB");
		//cb.startup();
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
		if (riverName=="Un-named" || riverName=="N/A") {
			summaryTxt = "Results of RACQUEL search at location "
		}
		else {
			summaryTxt = "Results of RACQUEL search on "+riverName+" at location "
		}
		summaryTxt = summaryTxt + this._getGridCoords(searchLocation);
		var resultPane = new dijit.layout.ContentPane({
			title:				riverName,
			doLayout:			false,
			className: "racquelResultPane",
			id:					"racquelResultPane"+searchId 
		});
		var summaryDiv = dojo.create('div',{
				innerHTML:summaryTxt,
				className:"racquelResultOverallTitle"
		});	
		dojo.addClass(summaryDiv,"racquelResultSection");
		resultPane.domNode.appendChild(summaryDiv);
		var tabDiv = dojo.create("div",{
		});	
		var tabs = new dijit.layout.TabContainer({
			doLayout:false
		});
		//if (routeExists !== null){
		//	resultPane.domNode.appendChild(this._formatReachResult(racquelResultItem['routeResult']['riverSegment']));
		//}
		if (siteExists !== null) {
			var siteContent = new dijit.layout.ContentPane({
				title:"At-site searches",
				content:this._formatSiteResult(racquelResultItem['siteResult']),
				style:"overflow:auto;max-height:500px;"
			});
			tabs.addChild(siteContent);
		}
		if (routeExists !== null) {
			var routeContent = new dijit.layout.ContentPane({
				title:"River searches",
				content:this._formatReachResult(racquelResultItem['routeResult']['riverSegment']),
				style:"overflow:auto;max-height:500px;"
			});
			routeContent.domNode.appendChild(this._formatRouteResult(racquelResultItem['routeResult']));
			tabs.addChild(routeContent);
		}
		if (catchExists !== null) {
			var catchContent = new dijit.layout.ContentPane({
				title:"Catchment searches",
				content:this._formatCatchResult(racquelResultItem['catchResults']),
				style:"overflow:auto;max-height:500px;"
			});
			tabs.addChild(catchContent);
		}
		tabDiv.appendChild(tabs.domNode);
		resultPane.domNode.appendChild(tabDiv);
		var okButton = new dijit.form.Button({
			label:"OK",
			onClick: dojo.hitch(this,function(){
				dialog.destroyRecursive();
			}),
			className:"racquelResultDialogButton"
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
	_getResultHTML:function(searchId){
		var html = "<html><head>RACQUEL Search Result";
		var css = "<style type='text/css'>"+ 
			".racquelResultSection{"+
			"-o-border-radius:3px;-moz-border-radius:3px;-webkit-border-radius:3px;border-radius:3px;"+
			"border: solid 1px #7EABCD;	padding: 2px 2px 2px 2px;margin: 0px 2px 3px 2px;background-color:white;"+
			"font-family: Geneva,Arial,Helvetica,sans-serif;font-size:10pt;	color:#485C5A;max-width:750px;}"+
			".racquelResultOverallTitle{font-size:12pt;}"+
			".racquelResultSectionTitle{font-weight:bold;font-size:12pt;color:peru;}"+
			".racquelResultsLayerTitle{font-weight:bold;background-color:#E7ECF4;margin-top:12px;margin-bottom:4px;"+
			"padding-left:3px;text-align:center;color:peru;}"+
			".racquelResultsLayerItem{padding-left:3px;}"+
			".racquelResultSection table{border: thin 1px #EEEEEE;background-color:white;margin:3px;margin-top:6px;}"+
			".racquelResultSection td{border: hidden;}"+
			".racquelResultSection th{border-bottom:thin 2px;border-top:none;border-left:none;border-right:none;color:peru;"+
			"</style>"
		html += css + "</head><body>";
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
		if (riverName=="Un-named" || riverName=="N/A") {
			summaryTxt = "Results of RACQUEL search at location "
		}
		else {
			summaryTxt = "Results of RACQUEL search on "+riverName+" at location "
		}
		summaryTxt = summaryTxt + this._getGridCoords(searchLocation);
		var summaryDiv = dojo.create('div',{
				innerHTML:summaryTxt,
				className:"racquelResultOverallTitle"
		});	
		dojo.addClass(summaryDiv,"racquelResultSection");
		var tempDiv = dojo.create("div");
		tempDiv.appendChild(summaryDiv);
		if (siteExists !== null) {
			var siteDiv = this._formatSiteResult(racquelResultItem['siteResult']);
			tempDiv.appendChild(siteDiv);
		}
		if (routeExists !== null) {
			var reachDiv = this._formatReachResult(racquelResultItem['routeResult']['riverSegment']);
			tempDiv.appendChild(reachDiv);
			var routeDiv = this._formatRouteResult(racquelResultItem['routeResult']);
			tempDiv.appendChild(routeDiv);
		}
		if (catchExists !== null) {
			var catchDiv = this._formatCatchResult(racquelResultItem['catchResults']);
			tempDiv.appendChild(catchDiv);
		}
		html += tempDiv.innerHTML;
		return html;
	},
	_formatReachResult:function(riverReachGraphic){
		var div = dojo.create("div",{
			className:"racquelResultSection"
		});
		var titleDiv = dojo.create("div",{
			innerHTML:"Selected river reach",
			className:"racquelResultSectionTitle"
		});
		div.appendChild(titleDiv);
		var summaryDiv = dojo.create("div",{
			className:"racquelResultsLayerItem"
		});
		var rivName = riverReachGraphic.attributes["OS_NAME"];
		if (rivName == "Un-named" || rivName =="N/A" ){
			summaryDiv.innerHTML = "The selected reach has no name recorded in the data.";
		}
		else {
			summaryDiv.innerHTML = "The selected reach is on the "+rivName+".";
		}
		div.appendChild(summaryDiv);
		div.appendChild(dojo.create("div",{
			className:"racquelResultsLayerItem",
			innerHTML: "The following attributes apply to this specific reach:"
		}));
		var tableContents = "";
		if (riverReachGraphic.attributes.hasOwnProperty('STRAHLER')){
			tableContents += "<tr><td>Strahler stream order:</td><td>" + riverReachGraphic.attributes['STRAHLER'] +"</td></tr>";
		}
		if (riverReachGraphic.attributes.hasOwnProperty('SHREVE')){
			tableContents += "<tr><td>Shreve stream order:</td><td>" + riverReachGraphic.attributes['SHREVE']+"</td></tr>";
		}
		if (riverReachGraphic.attributes.hasOwnProperty('WORK_')){
			tableContents += "<tr><td>Capital works:</td><td>" + riverReachGraphic.attributes['WORK_'];
			if (riverReachGraphic.attributes['WORK_']==="Capital"){
				tableContents += " (" + riverReachGraphic.attributes['WORKTYPE']+")";
			}
			tableContents += "</td></tr>";
		}
		if (tableContents.length > 0){
			div.appendChild(dojo.create("div",{
				innerHTML: "<table border='1'>"+tableContents+"</table>",
				className:"racquelResultsLayerItem"
			}));
		}
		return div;
	},
	_formatSiteResult:function(siteResultItem){
		var div = dojo.create("div",{
			className:"racquelResultSection"
		});
		var titleDiv = dojo.create("div",{
			innerHTML:"At-site results",
			className:"racquelResultSectionTitle"
		});
		div.appendChild(titleDiv);
		//var contents = "<H3>At-site results</H3>";
		var summaryDiv = dojo.create("div",{
			className:"racquelResultsLayerItem"
		});
		if (!siteResultItem.successful){
			//contents += "At site searches were not successful!"
			summaryDiv.innerHTML = "Sorry, at-site searches were not successful!"
			div.appendChild(summaryDiv);
		}
		else {
			summaryDiv.innerHTML = "The following table summarises the features found at the input location";
			div.appendChild(summaryDiv);
			var tableContents = 
				"<table border ='1'><tr><th>Layer</th><th>Site value</th></tr>";
            for (var i in siteResultItem.results)
			{
				if (siteResultItem.results.hasOwnProperty(i)){
					tableContents += "<tr><td>" + i + "</td><td>" + siteResultItem.results[i] + "</td></tr>";
				}
			}
			tableContents += "</table>";
			div.appendChild(dojo.create("div",{
				innerHTML:tableContents,
				className:"racquelResultsLayerItem"
			}));
		}
		return div;
	},
	_formatRouteResult:function(routeResultItem){
		var div = dojo.create("div",{
			className:"racquelResultSection"
		});
		var titleDiv = dojo.create("div",{
			innerHTML:"River routing results",
			className:"racquelResultSectionTitle"
		});
		div.appendChild(titleDiv);
		var summaryDiv = dojo.create("div",{
			className:"racquelResultsLayerItem"
		});
		
		if (!routeResultItem.successful){
			summaryDiv.innerHTML = "River routing search was not successful! <br/>"+
				"Please note that maximum snapping distance from the input location is 250m <br/>"+
				"and the river network does not extend downstream of the tidal limit."
			div.appendChild(summaryDiv);
			//contents += "River searches were not successful!"
		}
		else {
			var searchPt = routeResultItem.searchLocation.geometry;
			var locPt = routeResultItem.netLocation.geometry;
			var distance = Math.sqrt((searchPt.x - locPt.x)*(searchPt.x-locPt.x)+(searchPt.y-locPt.y)*(searchPt.y-locPt.y));
			summaryDiv.appendChild(dojo.create("div",{
				innerHTML: "The input location was snapped to on-channel location of "+
					Math.round(locPt.x) + "," + Math.round(locPt.y)
			}));
			summaryDiv.appendChild(dojo.create("div",{
				innerHTML: "This is "+Math.round(distance)+"m from the input location."
			}));
			div.appendChild(summaryDiv);
			//contents += "Input location was snapped to on-channel location of "+Math.round(locPt.x) + "," + Math.round(locPt.y)+"<br/>";
			//contents += "This is "+Math.round(distance)+"m from the input location.";
			var tableContents = 
						  	"<table border ='1'><tr><th>Route attribute</th><th>Value</th></tr>";
    		tableContents += "<tr><td>Distance along river channel from source (km)</td><td>" + 
				Math.round((routeResultItem.sourceRoute.attributes.Total_length/1000)*1000)/1000 + "</td></tr>";
    		tableContents += "<tr><td>Source location coordinates (Easting, Northing)</td><td>" + 
				Math.round(routeResultItem.source.geometry.x) + "," + Math.round(routeResultItem.source.geometry.y) + "</td></tr>";
    		tableContents += "<tr><td>Distance along river channel to tidal limit (km)</td><td>" + 
				Math.round((routeResultItem.mouthRoute.attributes.Total_length/1000)*1000)/1000 + "</td></tr>";
    		tableContents += "<tr><td>Mouth location coordinates (Easting, Northing) </td><td>" + 
				Math.round(routeResultItem.mouth.geometry.x) + "," + Math.round(routeResultItem.mouth.geometry.y) + "</td></tr></table>";
    		div.appendChild(dojo.create("div",{
				innerHTML:tableContents,
				className:"racquelResultsLayerItem"
			}));
		}
		return div;
	},
	_formatCatchResult:function(catchResultItem){
		var div = dojo.create("div",{
			//innerHTML:contents,
			className:"racquelResultSection"
		});
		var titleDiv = dojo.create("div",{
			innerHTML:"Catchment definition results",
			className:"racquelResultSectionTitle"
		});
		div.appendChild(titleDiv);
		//var contents = "<H3>Catchment definition results</H3>";
		var summaryDiv = dojo.create("div",{
			className:"racquelResultsLayerItem"
		});
		if (!catchResultItem.successful) {
			summaryDiv.innerHTML = "Catchment definition / extraction was not successful!";
			div.appendChild(summaryDiv);
			//contents += "Catchment definition / extraction was not successful!"
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
			if (catchResultItem.catchmentQC){
				if (catchResultItem.catchmentQC == "QC_OK"){
					summaryDiv.appendChild(dojo.create("div",{
						innerHTML:"Quality Control: OK (Source point is within catchment)"
					}));
				}
				else{
					summaryDiv.appendChild(dojo.create("div",{
						innerHTML: "Quality Control: WARNING! Source point is not within catchment."
					}));
					summaryDiv.appendChild(dojo.create("div",{
						innerHTML: "This may mean that the river network does not follow the topography - for example where "+
							"there are artificial channels or culverts linking catchments. Or "+
							"the data used to define the catchment may not accurately reflect the topography."
					}));
					summaryDiv.appendChild(dojo.create("div",{
						innerHTML: "Alternatively the river may be on the secondary part of a bifurcated section"+
							"."
					}));
					summaryDiv.appendChild(dojo.create("div",{
						innerHTML: "Please check the results on the map."
					}));
				}
			}
			else{
				summaryDiv.appendChild(
					dojo.create("div",{
						innerHTML: "Quality Control: Catchment not quality controlled as route search was not done or not successful"
				}))
				//contents += "QC: Catchment not quality controlled as route search was not done or not successful<br/>";
			}
			summaryDiv.appendChild(dojo.create("div",{
				innerHTML: "Total catchment area is "+
				Math.round((catchResultItem["totalArea"]/1000000)*1000)/1000 + " sq km"
			}));
			//contents += "Total catchment area is "+
			//	Math.round((catchResultItem["totalArea"]/1000000)*1000)/1000 + " sq km<br/>";
			// now do those in AvailableExtractionParams
			// we're not sorting them - they may not always appear in same order. easy enough to sort if 
			// anyone moans though
			
			var contents = "";
			var resultsDiv = dojo.create("div",{
				className:"racquelResultsDetail"
			});
			var allPossibleExtractions = this.toolbar.racquelInteractiveSettings.getAvailableParams();
			for (var possibleParamName in allPossibleExtractions){
				if (data.hasOwnProperty(possibleParamName)){
					var parameterDetails = allPossibleExtractions[possibleParamName];
					if (parameterDetails.ExtractionType === "Literal"){
						contents += parameterDetails["name"]+": ";
						contents += (Math.round((data[possibleParamName])*1000)/1000) + "<br/>"; 
					}
					else if (parameterDetails.ExtractionType === "ContinuousRaster"){
						resultsDiv.appendChild(dojo.create("div",{
							innerHTML:parameterDetails["LayerName"],
							className: "racquelResultsLayerTitle"
						}));
						//contents += "<h4>" + parameterDetails["LayerName"] + "</h4>";
						// choose the number of decimal places based on the range of values returned
						// 3 dp for range <10, 2 dp for 10-100, 1dp for 100-1000, 0dp over 1000 
						// - TODO: is this a problem, seeing as it max give different results for different
						// catchments? I think not, it is relatively rare that the range in the results will
						// not be of the same order of magnitude as overall data
						var range = data[possibleParamName]["Results"]["Max"] - data[possibleParamName]["Results"]["Min"];
						var sigs = Math.max (0,4 - 
							parseInt(range).toString().length);
						var maxVal = data[possibleParamName]["Results"]["Max"];
						var minVal = data[possibleParamName]["Results"]["Min"];
						var meanVal = data[possibleParamName]["Results"]["Mean"];
						var max = maxVal.toFixed(sigs); // nb output is string
						var min = minVal.toFixed(sigs);
						var mean = meanVal.toFixed(sigs);
						//var max = Math.round(((data[possibleParamName]["Results"]["Max"])/10)*10)/10;
						//var min = Math.round(((data[possibleParamName]["Results"]["Min"])/10)*10)/10;
						//var mean = Math.round(((data[possibleParamName]["Results"]["Mean"])/10)*10)/10;
						var tableContents = "<table border='1'><tr><th colspan=2>Summary of data in catchment</th></tr>";
						tableContents += "<tr><td>Maximum value</td><td>"+max+"</td></tr>";
						tableContents += "<tr><td>Minimum value</td><td>"+min+"</td></tr>";
						tableContents += "<tr><td>Average (mean) value</td><td>"+mean+"</td></tr>";
						tableContents += "</table>"
						resultsDiv.appendChild(dojo.create("div",{
							innerHTML: 	tableContents,
							className: "racquelResultsLayerItem"
						}));
					}
					else if (parameterDetails.ExtractionType === "CategoricalRaster"){
						//contents += "<table border='1'><tr><th colspan=2>" + parameterDetails["LayerName"] + "</th></tr>";
						resultsDiv.appendChild(dojo.create("div",{
							innerHTML:parameterDetails["LayerName"],
							className: "racquelResultsLayerTitle"
						}));
						var tableContents = "<table border='1'><tr><th colspan=2>Summary by class (raster value)</th></tr>";
						var sortedClasses = this._propsToSortedArray(data[possibleParamName]["Results"]);
						if (sortedClasses.length == 0) {
							tableContents = "No cells were extracted from the raster! Maybe the cell size<br/>" +
							"is bigger than the catchment";
						}
						else {
							//for (var dataClass in data[possibleParamName]["Results"]){
							for (var classIdx = 0; classIdx < sortedClasses.length; classIdx++) {
								var dataClass = sortedClasses[classIdx][0];
								var dataVal = Math.round((sortedClasses[classIdx][1]) * 100) / 100;
								var classes;
								if (describer[possibleParamName] && describer[possibleParamName]["classes"]) {
									classes = describer[possibleParamName]["classes"];
								}
								if (data[possibleParamName]["Results"].hasOwnProperty(dataClass)) {
									// round if necessary 
									//var value = Math.round((data[possibleParamName]["Results"][dataClass])*100)/100;
									tableContents += "<tr><td>";
									tableContents += "Class " + dataClass
									if (classes && classes[dataClass]) {
										tableContents += " (" + classes[dataClass] + ")";
									}
									tableContents += "</td>";
									tableContents += "<td>" + dataVal + "%</td></tr>";
								}
							}
							tableContents += "</table>";
						}
						resultsDiv.appendChild(dojo.create("div",{
							innerHTML:tableContents,
							className:"racquelResultsLayerItem"
						}));
					}
					else if (parameterDetails.ExtractionType === "PointFeatures"){
						resultsDiv.appendChild(dojo.create("div",{
							innerHTML: parameterDetails["LayerName"],
							className: "racquelResultsLayerTitle"
						}))
						//contents += "<h4>" + parameterDetails["LayerName"] + "</h4>";
						var numFeats = data[possibleParamName]["Results"]["Count"];
						var itemDiv = dojo.create("div",{
							className:"racquelResultsLayerItem"
						});
						itemDiv.appendChild(dojo.create("div",{
							innerHTML:"Total number of features found within catchment: "+numFeats
						}));
						//contents += "Number of features found within catchment: "+numFeats+ "<br/>";
						var cats = data[possibleParamName]["Results"]["Categories"];
						var categoryContent = "";
						var sortedCats = this._propsToSortedArray(cats);
						var numCats = sortedCats.length;
						//for (var category in cats){
						for (var catIdx=0;catIdx<sortedCats.length;catIdx++){
							var cat = sortedCats[catIdx][0];
							var catData = sortedCats[catIdx][1];
							var catCount = catData["Count"];
							//if (cats.hasOwnProperty(category)){
							//	var catcount = cats[category]["Count"];
								//var catlength = Math.round((cats[category]["Length"])*100)/100;
							categoryContent += "<tr><td>" + cat+"</td>";
							categoryContent += "<td>"+catCount+"</td></tr>";
								//categoryContent += "<td>"+catlength+"</td></tr>";
					//		}
						}
						if (numCats > 0){
							var categoryFieldName = parameterDetails["CategoryField"].toProperCase();
							//contents +=
							itemDiv.appendChild (dojo.create("div",{
								innerHTML: "<table border='1'><tr><th colspan=2>Summarised by category field '"+categoryFieldName+"'</th></tr>" +
								"<tr><th>"+categoryFieldName+"</th><th>Feature count</th></tr>" +
								categoryContent +
								"</table>" 
							}));
						}
						resultsDiv.appendChild(itemDiv);
					}
					else if (parameterDetails.ExtractionType === "LineFeatures"){
						resultsDiv.appendChild(dojo.create("div",{
							innerHTML:parameterDetails["LayerName"],
							className:"racquelResultsLayerTitle"
						}));
						//contents += "<h4>" + parameterDetails["LayerName"] + "</h4>";
						var count = data[possibleParamName]["Results"]["Count"];
						var length = Math.round((data[possibleParamName]["Results"]["Length"]/1000)*100)/100;
						var itemDiv = dojo.create("div",{
							className:"racquelResultsLayerItem"
						});
						itemDiv.appendChild(dojo.create("div",{
							innerHTML: "Total length of features within catchment: "+length+ " km"
						}));
						itemDiv.appendChild(dojo.create("div",{
							innerHTML: "Total number of features within or partially within catchment: "+count
						}));
						//contents += "Total length of features within catchment: "+length+ " km<br/>";
						//contents += "Total number of features within or partially within catchment: "+count+ "<br/>";
						var cats = data[possibleParamName]["Results"]["Categories"]
						var categoryContent = ""
						var sortedCats = this._propsToSortedArray(cats);
						var numCats = sortedCats.length;
						for (var catIdx=0;catIdx<sortedCats.length;catIdx++){
						//for (var category in cats){
							var cat = sortedCats[catIdx][0];
							var catData = sortedCats[catIdx][1];
							var catCount = catData["Count"];
							var catLength = Math.round((catData["Length"]/1000)*100)/100;
							//if (cats.hasOwnProperty(category)){
								//var catcount = cats[category]["Count"];
								//var catlength = Math.round((cats[category]["Length"]/1000)*100)/100;
							categoryContent += "<tr><td>" + cat+"</td>";
							categoryContent += "<td>"+catCount+"</td>";
							categoryContent += "<td>"+catLength+"</td></tr>";
							//}
						}
						if (numCats>0){
							var categoryFieldName = parameterDetails["CategoryField"].toProperCase();
							itemDiv.appendChild(dojo.create("div",{
								innerHTML:"<table border='1'><tr><th colspan=3>Summarised by category field '"+categoryFieldName+"'</th></tr>" +
								"<tr><th>"+categoryFieldName+"</th><th>Feature count</th><th>Length (km)</th>" +
								categoryContent +
								"</table>" 
							}));
						}
						resultsDiv.appendChild(itemDiv);
					}
					else if (parameterDetails.ExtractionType === "PolygonFeatures"){
						resultsDiv.appendChild(dojo.create("div",{
							innerHTML:parameterDetails["LayerName"],
							className:"racquelResultsLayerTitle"
						}));
						//contents += "<h4>" + parameterDetails["LayerName"] + "</h4>";
						var count = data[possibleParamName]["Results"]["Count"];
						var area = Math.round((data[possibleParamName]["Results"]["Area"] / 1000000)*1000)/1000;
						var itemDiv = dojo.create("div",{
							className:"racquelResultsLayerItem"
						});
						itemDiv.appendChild(dojo.create("div",{
							innerHTML:"Total area covered by features within catchment: "+area+ " sq km"
						}));
						itemDiv.appendChild(dojo.create("div",{
							innerHTML: "Total number of features within or partially within catchment: "+count
						}));
						var cats = data[possibleParamName]["Results"]["Categories"]
						var categoryContent = ""
						var sortedCats = this._propsToSortedArray(cats);
						var numCats = sortedCats.length;
						for (var catIdx = 0;catIdx<sortedCats.length;catIdx++){
						//for (var category in cats){
							//if (cats.hasOwnProperty(category)){
							var cat = sortedCats[catIdx][0];
							var catData = sortedCats[catIdx][1];
							var catCount = catData["Count"];
							var catArea = Math.round((catData["Area"]/1000000)*1000)/1000;
								//var catcount = cats[category]["Count"];
								//var catArea = Math.round((cats[category]["Area"]/1000000)*1000)/1000;
								categoryContent += "<tr><td>" + cat+"</td>";
								categoryContent += "<td>"+catCount+"</td>";
								categoryContent += "<td>"+catArea+"</td></tr>";
								hasCats=true;
							//}
						}
						if (numCats>0){
							var categoryFieldName = parameterDetails["CategoryField"].toProperCase();
							itemDiv.appendChild(dojo.create("div",{
								innerHTML:"<table border='1'><tr><th colspan=3>Summarised by category field '"+categoryFieldName+"'</th></tr>" +
								"<tr><th>"+categoryFieldName+"</th><th>Feature count</th><th>Area (sq km)</th>" +
								categoryContent +
								"</table>"
							}));
						}
						resultsDiv.appendChild(itemDiv);
					}
				}
			}
		}
		div.appendChild(summaryDiv);
		div.appendChild(resultsDiv);
		//div.innerHTML += contents;
		return div;
	},
	_propsToSortedArray:function(props){
		var sortedClasses = [];
		for (var dataClass in props){
			if (props.hasOwnProperty(dataClass)){
				sortedClasses.push([dataClass,props[dataClass]]);
			}
		}
		sortedClasses.sort(dojo.hitch(this,function(a,b){
			return a[0]-b[0];
		}));
		return sortedClasses;
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
			doLayout:			false,
			id:			"saveIntroPane",
			className: "racquelResultPane"
			 
		});
		//dojo.style(saveDialogContent.domNode,"max-width:750px;");
		//saveDialogContent.domNot
		saveDialogContent.domNode.appendChild(dojo.create("div",{
			innerHTML:"Export results",
			className:"racquelResultsLayerTitle"
		}));
		var summaryDiv = dojo.create('div',{
			innerHTML: "This will export selected results to shapefiles.",
			className: "racquelWelcomeContentParagraph"
		});
		dojo.addClass(summaryDiv,"racquelResultSection");
		summaryDiv.appendChild(dojo.create('div',{
			innerHTML: "It works best / quickest in Google Chrome. "+
			"Other browsers should work if you have Flash installed but there "+ 
			"may be a short pause during which your browser appears unresponsive, "+ 
			"whilst the shapefile(s) are created. This may cause your browser to show a "+
			"'Script Unresponsive' message - please choose continue, if so. "+
			"If this is a problem, please upgrade your browser.",
			className: "racquelWelcomeContentParagraph"
		}));
		//dojo.addClass(explainDiv,"racquelResultSection");
		saveDialogContent.domNode.appendChild(summaryDiv);
		//saveDialogContent.domNode.appendChild(explainDiv);		
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
				this.exportGraphics(graphicsToExport,selectedIds);
			}));
		}
		else {
			this.exportGraphics(graphicsToExport,selectedIds);
		}
	},
	exportGraphics:function(graphics,selectedIds){
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
		dojo.forEach(selectedIds,dojo.hitch(this,function(id){
			var htmlFileContent = this._getResultHTML(id);
			saver.addData({
				filename:"racquel_result_details_"+id,
				extension:"html",
				datablob: {data:htmlFileContent}
			});
		}));
		
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
		var summaryDiv = dojo.create('div',{
			innerHTML:"Click the button to save results",
			className:"racquelResultSectionTitle"
		},saveDialogContent.domNode);		
		saveDialogContent.startup();
		var dialog = new dijit.Dialog({
			title: "Save results",
			content: saveDialogContent,
			refreshOnShow:true,
			onCancel:function(){
				this.destroyRecursive();
			},
			className: "racquelWelcomeDialog",
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

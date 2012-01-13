dojo.provide("racquelDijits.racquelResultStore")

dojo.declare("racquelDijits.racquelResultStore",[],{
	resultStore: {}, // declaring it here rather than in constructor means it is static i.e. same across all instantiations 
	constructor:function(){
		
	},
	storeWholeResult:function(racquelResultObject){
		if ((racquelResultObject.hasOwnProperty('siteResult') || racquelResultObject.hasOwnProperty('routeResult')|| 
			racquelResultObject.hasOwnProperty('catchResults')) 
			&&
			racquelResultObject.hasOwnProperty('searchId')){
				this.resultStore[racquelResultObject.searchId] = racquelResultObject;
				dojo.publish("racquelResultStored",[racquelResultObject.searchId]);
				return true;
			}
		else {
			console.log("Attempt was made to store an RACQUEL result that didn't contain a searchId and at least one result");
			return false;
		}
	},
	clearAllResults:function(){
		this.resultStore = {};
		dojo.publish("racquelResultsCleared",true);
	},
	deleteResult:function(searchId){
		if(this.resultStore.hasOwnProperty(searchId)){
			delete this.resultStore[searchId];
			console.log("racquelResultStore deleted item "+searchId);
			dojo.publish("racquelResultCleared",searchId);
			return true;
		}
		else {
			console.log("racquelResultStore could not find item "+searchId);
			return false;
		}
	},
	getWholeResult:function(searchId){
		if (this.resultStore.hasOwnProperty(searchId)){
			return dojo.clone(this.resultStore[searchId]);
		}
		else { return {}; }
	},
	getSiteResult:function(searchId){
		if (this.resultStore.hasOwnProperty(searchId)){
			return dojo.clone(this.resultStore[searchId].siteResult);
		}
		else {return {};}
	},
	getRouteResult:function(searchId){
		if (this.resultStore.hasOwnProperty(searchId)){
			return dojo.clone(this.resultStore[searchId].routeResult);
		}
		else {return {};}
	},
	getCatchResult:function(searchId){
		if (this.resultStore.hasOwnProperty(searchId)){
			return dojo.clone(this.resultStore[searchId].catchResult);
		}
	},
	getSearchIds:function(){
		var searchIndices = [];
		for (var idx in this.resultStore){
			if (this.resultStore.hasOwnProperty(idx)){
				searchIndices.push(idx);
			}
		}
		return searchIndices;
	},
	getResultForStorage:function(searchId){
		// cannot just use dojo.toJson directly on racquel result object for storage in window.localStorage
		// because functions are not stored and thus what comes back out aren't truly graphics
		// we have to call toJson on the graphic and store the result
		// then on reload use new Esri.Graphic(jsonversion) to recreate
		var nativeResult = this.resultStore[searchId];
		var storageResult = {
			searchId:searchId,
			searchLocation:nativeResult['searchLocation'].toJson()
		}
		if (nativeResult.hasOwnProperty('siteResult')){
			// only graphic that will be damaged by storage in a siteResult is searchLocation
			storageResult['siteResult'] = dojo.clone(nativeResult['siteResult'])
			storageResult['siteResult']['searchLocation'] = nativeResult['siteResult']['searchLocation'].toJson();
		}
		if (nativeResult.hasOwnProperty('routeResult')){
			// route results contain graphics of mouth, mouthRoute,riverSegment,source,sourceRoute,
			// searchLocation, netLocation
			var rr = nativeResult['routeResults'];
			storageResult['routeResults'] = {
				searchId: 			rr['searchId'],
				successful: 		rr['successful'],
				racquelResultType: 	rr['racquelResultType'],
				searchLocation: 	rr['searchLocation'].toJson()
			}
			if (rr['successful']){
				storageResult['routeResults']['riverSegment'] 	= rr['riverSegment'].toJson();
				storageResult['routeResults']['source'] 		= rr['source'].toJson();
				storageResult['routeResults']['mouth'] 			= rr['mouth'].toJson();
				storageResult['routeResults']['sourceRoute'] 	= rr['sourceRoute'].toJson();
				storageResult['routeResults']['mouthRoute'] 	= rr['mouthRoute'].toJson();
				storageResult['routeResults']['searchLocation'] = rr['searchLocation'].toJson();
				storageResult['routeResults']['netLocation'] 	= rr['netLocation'].toJson();
			}
		}
		if (nativeResult.hasOwnProperty('catchResults')){
			// catchment results contain graphics "catchment" and "searchLocation"
			var cr = nativeResult['catchResults'];
			storageResult['catchResults'] = dojo.clone(cr);
			storageResult['catchResults']['searchLocation'] = cr['searchLocation'].toJson();
			if (cr['successful']){
				storageResult['catchment'] = cr['catchment'].toJson();
			}		
		}
	},
	addResultsFromStorageItem:function(jsonStoredResults){
		// we assume that jsonStoredResults is a javascript object that has been recreated from the localStorage
		// via dojo.fromJson i.e
		// dojo.fromJson(window.localStorage.getItem("racquelPersistedResults")) 
		// i.e. it may have many results in it
		for (var storedSearchId in jsonStoredResults){
			// property names and so storedSearchId are strings. Arghhh!!
			storedSearchId = parseInt(storedSearchId); 
			if (jsonStoredResults.hasOwnProperty(storedSearchId)){
				var jsonStoredResult = jsonStoredResults[storedSearchId]; 
				var nativeResult = {
					searchId:storedSearchId, 
					searchLocation:new esri.Graphic(jsonStoredResult['searchLocation'])
				};
				if(jsonStoredResult.hasOwnProperty('siteResult')){
					nativeResult['siteResult'] = dojo.clone(jsonStoredResult['siteResult'])
					nativeResult['siteResult']['searchLocation'] = 
						new esri.Graphic(jsonStoredResult['siteResult']['searchLocation']);
				}
				if(jsonStoredResult.hasOwnProperty('routeResult')){
					var storedRR = jsonStoredResult['routeResult'];
					nativeResult['routeResult'] = {
						searchId: 			storedRR['searchId'],
						successful: 		storedRR['successful'],
						racquelResultType: 	storedRR['racquelResultType'],
						searchLocation: 	new esri.Graphic(storedRR['searchLocation'])
					}
					if (storedRR['successful']){
						nativeResult['routeResult']['riverSegment'] 	= new esri.Graphic(storedRR['riverSegment']);
						nativeResult['routeResult']['source'] 			= new esri.Graphic(storedRR['source']);
						nativeResult['routeResult']['mouth'] 			= new esri.Graphic(storedRR['mouth']);
						nativeResult['routeResult']['sourceRoute'] 	= new esri.Graphic(storedRR['sourceRoute']);
						nativeResult['routeResult']['mouthRoute'] 		= new esri.Graphic(storedRR['mouthRoute']);
						nativeResult['routeResult']['searchLocation'] 	= new esri.Graphic(storedRR['searchLocation']);
						nativeResult['routeResult']['netLocation'] 	= new esri.Graphic(storedRR['netLocation']);
					}
				}
				if (jsonStoredResult.hasOwnProperty('catchResults')){
					var storedCR = jsonStoredResult['catchResults'];
					nativeResult['catchResults']= dojo.clone(storedCR);
					nativeResult['catchResults']['searchLocation'] = new esri.Graphic(storedCR['searchLocation']);
					if (storedCR['successful']){
						nativeResult['catchResults']['catchment'] = new esri.Graphic(storedCR['catchment']);
					}
				}
			}
			this.storeWholeResult(nativeResult);
		}
	},
	getResultAsAttributedGraphics:function(searchId){
		// flattens a racquelResult object into an array of esri.Graphics, containing graphics for each of
		// site search, route search, catchment search, search location, network location
		// the site. this is for conversion to shapefile output
		var nativeResult = this.resultStore[searchId];
		var outputArray = [];
		var siteGraphic = dojo.clone(nativeResult['searchLocation']);
		if (nativeResult.hasOwnProperty('siteResult') && nativeResult['siteResult'].successful){
			var attribs = nativeResult['siteResult']['results'];
			attribs['SEARCHID'] = nativeResult['siteResult']['searchId'];
			attribs['TYPE']="SearchSite";
			siteGraphic.setAttributes(attribs);
		}
		else {
			var attribs = {
				SEARCHID: nativeResult['searchId'],
				TYPE: "SearchSite"
			}
			siteGraphic.setAttributes(attribs);
		}
		outputArray.push(siteGraphic)
		if (nativeResult.hasOwnProperty('routeResult') && nativeResult['routeResult'].successful){
			var rr = nativeResult['routeResult'];
			var sourceGraphic = dojo.clone(rr['source']);
			sourceGraphic.setAttributes({
				SEARCHID: rr.searchId,
				TYPE: "SourcePoint"
			});
			outputArray.push(sourceGraphic);
			var mouthGraphic = dojo.clone(rr['mouth']);
			mouthGraphic.setAttributes({
				SEARCHID: rr.searchId,
				TYPE: "MouthPoint"
			});
			outputArray.push(mouthGraphic);
			var netLocGraphic = dojo.clone(rr['netLocation']);
			netLocGraphic.setAttributes({
				SEARCHID:rr.searchId,
				TYPE: "NetLocation"
			});
			outputArray.push(netLocGraphic);
			var sourceRouteGraphic = dojo.clone(rr['sourceRoute']);
			var srattribs = {
				SEARCHID:rr.searchId,
				TYPE: "SourceRoute"
			};
			srattribs['LENGTH'] = sourceRouteGraphic.attributes['Total_length']; 
			sourceRouteGraphic.setAttributes(srattribs);
			outputArray.push(sourceRouteGraphic);
			var mouthRouteGraphic = dojo.clone(rr['mouthRoute']);
			var mrattribs = {
				SEARCHID:rr.searchId,
				TYPE: "MouthRoute"
			};
			mrattribs['LENGTH'] = mouthRouteGraphic.attributes['Total_length'];
			mouthRouteGraphic.setAttributes(mrattribs);
			outputArray.push(mouthRouteGraphic);
		}
		if (nativeResult.hasOwnProperty('catchResults') && nativeResult['catchResults'].successful){
			var cr = nativeResult['catchResults'];
			var catchGraphic = dojo.clone(cr['catchment']);
			var attribs = {
				SEARCHID: catchGraphic.attributes['searchId'],
				TYPE: "Catchment",
				CATCHAREA: catchGraphic.attributes['area']
			}
			if (cr.hasOwnProperty('elev')){
				for (var elevattr in cr['elev']){
					if (cr['elev'].hasOwnProperty(elevattr)){
						attribs[elevattr] = cr['elev'][elevattr]
					}
				}
			}
			if (cr.hasOwnProperty('lcm2k')){
				for (var lcmattr in cr['lcm2k']){
					if (cr['lcm2k'].hasOwnProperty(lcmattr)){
						attribs["LCM2K_"+lcmattr] = cr['lcm2k'][lcmattr]
					}
				}
			}
			if (cr.hasOwnProperty('uplength')){
				attribs["UPLENGTH"] = cr['uplength']
			}
			catchGraphic.setAttributes(attribs);
			outputArray.push(catchGraphic);
		}
		return outputArray;
	}
})
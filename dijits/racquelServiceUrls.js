dojo.provide("racquelDijits.racquelServiceUrls");
// this class is just a place to define the URLs for the route, identify, and catchment services 
// that will be used to add graphics to the map
// the catchment service also needs to define the extraction options that are available (TODO)
// all properties are "static" i.e. same across all instantiations, as they're not in the constructor
dojo.declare("racquelDijits.racquelServiceUrls",[],{
	racquelSiteService: {
		URL:    "http://192.171.192.6/ArcGIS/rest/services/IRN/IRN_Polygon_Datasets/MapServer",
		Layers: [0,1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17],
		LayerOption: esri.tasks.IdentifyParameters.LAYER_OPTION_ALL
	},
	racquelRouteService: {
		URL: "http://192.171.192.6/ArcGIS/rest/services/IRN/IRN_Data/MapServer",
		SourceLayer: 0,
		MouthLayer: 3,
		TideLayer: 1
	},
	racquelFeatureService: {
		URL: "http://192.171.192.6/ArcGIS/rest/services/IRN/IRN_Data/MapServer/4",
		Fields: ["OS_NAME", "LENGTH", "STRAHLER", "SHREVE", "WORK_", "WORKTYPE", "FNODE_FULL", "TNODE_FULL"],
		NameField: "OS_NAME"
	},
	racquelCatchmentService: {
		URL: 				"http://192.171.192.6/ArcGIS/rest/services/Test/irn_watershed_svc/MapServer/exts/WatershedSOE/createWatershed",
		ExtractionData: 	["lcm2k", "elev", "totalupstream"],
		IDParamName: 		"hydroshed_id",
		LocationParamName: 	"location",
		ExtentParamName: 	"extent"
	} 
});
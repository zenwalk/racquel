dojo.provide("racquelDijits.mapLayersConfig");
dojo.declare("racquelDijits.mapLayersConfig",[],{
	fulldata : {
		baseLayers: [
		// note the order is important as it determines the order they will be added to the map
		// hence using array
		{
			url: "http://wlwater.ceh.ac.uk/ArcGIS/rest/services/TileMapLayers/UK_Coastline_Vignetted/MapServer",
			name: 		"Coastline",
			visible:	true
		},
		{
			url: "http://wlwater.ceh.ac.uk/ArcGIS/rest/services/OSOpendata/OS_Opendata_Backdrop/MapServer",
			name: "OS Maps",
			visible: false
		},
		{
			url: "http://wlwater.ceh.ac.uk/ArcGIS/rest/services/TileMapLayers/UK_Rivers_Cached/MapServer",
			name: "Rivers",
			visible:true
		}
		],
		dynamicLayers: [
		{
			url: "http://wlwater.ceh.ac.uk/ArcGIS/rest/services/NRFA_GIS/NRFA_Browser_Dynamic_Service/MapServer",
			name:	"NRFA Website maps",
			visible: [-1]
		}
		]
	},
	openaccess:{
		baseLayers:[
			{
				url: "http://wlwater.ceh.ac.uk/ArcGIS/rest/services/TileMapLayers/UK_Coastline_Vignetted/MapServer",
				name: 		"Coastline",
				visible:	true
			},
		
			{
				//url:"https://datahub.esriuk.com/ArcGIS/rest/services/GB_Basemap/OS_Open_Background/MapServer?"
				//	+"token=eLo2P11qgI0aEdQ15qwMMYP6JcS_j3CP5Fj1FjkEcaIY14k2qpafkx5yjkarzpt4_2SoluyYfe8W5PQhFyq6kA9bTV55KHjgm0LxCN-v_qe4AINE2bYrRkrI5bvrn7PvoHpCv4ZS4b0sdT-FAzRgovXQUfbtojUxbPuqe-31MX8.",
				url: "http://wlwater.ceh.ac.uk/ArcGIS/rest/services/OSOpendata/OS_Opendata_Backdrop/MapServer",
				name: "OS Map",
				visible:false
			},
			{
				url: "http://wlwater.ceh.ac.uk/ArcGIS/rest/services/TileMapLayers/UK_Rivers_Cached/MapServer",
				name: "Rivers",
				visible:true
			}
		],
		dynamicLayers:[
		{
			url:"http://wlwater.ceh.ac.uk/ArcGIS/rest/services/NRFA_Website/Website_Spatial_Page_Service/MapServer",
			name: "Overlays",
			visible: [-1]
		}
		]
	}
	
});

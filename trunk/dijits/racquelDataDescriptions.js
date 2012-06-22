dojo.provide("racquelDijits.racquelDataDescriptions");
// this class is just a place to store dataset class mappings / descriptions
// All properties are "static" i.e. same across all instantiations as they're not in constructor
// This class currently must be updated to reflect catgorical raster datasets used in the configured catchment
// extraction service, if you want the results view to give the description rather than just a class value
// TODO - extent the describeLayers operation on SOE to retrieve these descriptions at runtime   
dojo.declare("racquelDijits.racquelDataDescriptions", [], {
    lcm2k: {
        name: "Land Cover Map 2000",
        id: "lcm2k",
		source: "http://www.ceh.ac.uk/documents/lcm2000_raster_dataset_details.pdf",
        classes: {
            221: "Sea / Estuary",
            131: "Water (inland)",
            201: "Littoral rock",
            211: "Littoral sediment",
            212: "Saltmarsh",
            181: "Supra-littoral rock",
            191: "Supra-littoral sediment",
            121: "Bog (deep peat)",
            101: "Dense dwarf shrub heath",
            102: "Open dwarf shrub heath",
            151: "Montane habitats",
            11: "Broad-leaved / mixed woodland",
            21: "Coniferous woodland",
            51: "Improved grassland",
            61: "Neutral grassland",
            52: "Setaside grassland",
            91: "Bracken",
            71: "Calcareous grassland",
            81: "Acid grassland",
            111: "Fen, marsh, swamp",
            41: "Arable cereals",
            42: "Arable horticulture",
            43: "Arable non-rotational",
            171: "Suburban / rural developed",
            172: "Continuous urban",
            161: "Inland bare ground"
        }
    },
	URBX90: {
		name:"Urban Extent (1990 dataset)",
		classes:{
			1: "Suburban",
			2: "Urban"
		}
	},
	URBX2K: {
		name:"Urban Extent (2000 dataset)",
		classes:{
			1: "Suburban (including arable / horticulture within extent of settlements)",
			2: "Urban",
			3: "Inland Bare Ground (within extent of settlements)"
		}
	},
    lcm2000aggregate: {
        name: "Land Cover Map 2000 aggregate classes",
        id: "lcm2kagg",
		source: "http://www.ceh.ac.uk/documents/lcm2000_raster_dataset_details.pdf",
        classes: {
            10: "Oceanic seas",
            8: "Standing open water",
            9: "Coastal",
            6: "Mountain, heath, bog",
            1: "Broad-leaved / mixed woodland",
            2: "Coniferous woodland",
            4: "Improved grassland",
            5: "Semi-natural grassland",
            3: "Arable and horticulture",
            7: "Built up areas and gardens"
        }
    },
    lcm2000ClassGrouping: {
        name: "Land Cover Map 2000 class - aggregate class mapping",
        id: "lcm2kaggmap",
		source: "http://www.ceh.ac.uk/documents/lcm2000_raster_dataset_details.pdf",
        classes: {
            221: 10,
            131: 8,
            201: 9,
            211: 9,
            212: 9,
            181: 9,
            191: 9,
            121: 6,
            101: 6,
            102: 6,
            151: 6,
            11: 1,
            21: 2,
            51: 4,
            61: 5,
            52: 5,
            91: 5,
            71: 5,
            81: 5,
            111: 5,
            41: 3,
            42: 3,
            43: 3,
            171: 7,
            172: 7,
            161: 6
        }
    },
	constructor:function(){
		
	}
});

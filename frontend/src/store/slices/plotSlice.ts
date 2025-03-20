import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ColorMapKey } from "../../utils/record-util";

interface PlotState {
    colorMaps: { [key: string]: string[] },
    selectedColorMap: string
}

const initialState: PlotState = {
    colorMaps: {
        'VsSurf-1': [
            "rgb(255,255,255, 0.0)",
            "rgb(123,122,230, 0.0784313725)",
            "rgb(102,45,248, 0.137254908)",
            "rgb(99,151,255, 0.1960784314)",
            "rgb(7,90,255, 0.2549019608)",
            "rgb(0,247,255, 0.3921568627)",
            "rgb(10,245,88, 0.5098039216)",
            "rgb(76,204,90, 0.5882352941)",
            "rgb(154,208,48, 0.6470588235)",
            "rgb(168,250,5, 0.7058823529)",
            "rgb(254,247,0, 0.7843137255)",
            "rgb(255,156,0, 0.8431372549)",
            "rgb(255,105,0, 0.9215686275)",
            "rgb(255,0,0, 0.9960784314)",
            "rgb(165,0,38, 1.0)"
        ],
        'VsSurf-2': [
            "rgb(49,54,149, 0.0)",
            "rgb(69,117,180, 0.0039215686)",
            "rgb(116,173,209, 0.1254901961)",
            "rgb(171,217,233, 0.2509803922)",
            "rgb(224,243,248, 0.3764705882)",
            "rgb(255,255,191, 0.5019607843)",
            "rgb(254,224,144, 0.6274509804)",
            "rgb(253,174,97, 0.7490196078)",
            "rgb(244,109,67, 0.8745098039)",
            "rgb(215,48,39, 0.99960784314)",
            "rgb(165,0,38, 1.0)"
        ],
        'RdYlBu': [
            'rgb(165,0,38, 0.0)',
            'rgb(215,48,39, 0.2)',
            'rgb(253,174,97, 0.5)',
            'rgb(224,243,248, 0.8)',
            'rgb(171,217,233, 0.9)',
            'rgb(49,54,149, 1.0)'
        ],
        'Spectral': [
            'rgb(158,1,66, 0.0)',
            'rgb(213,62,79, 0.1)',
            'rgb(244,109,67,0.2)',
            'rgb(253,174,97,0.3)',
            'rgb(254,224,139,0.4)',
            'rgb(255,255,191, 0.5)',
            'rgb(230,245,152, 0.6)',
            'rgb(171,221,164, 0.7)',
            'rgb(102,194,165, 0.8)',
            'rgb(50,136,189, 0.9)',
            'rgb(94,79,162, 1.0)'
        ],
        'PuOr': [
            'rgb(127,59,8, 0.0)',
            'rgb(179,88,6, 0.1)',
            'rgb(224,130,20, 0.2)',
            'rgb(253,184,99, 0.3)',
            'rgb(254,224,182, 0.4)',
            'rgb(247,247,247, 0.5)',
            'rgb(216,218,235, 0.6)',
            'rgb(178,171,210, 0.7)',
            'rgb(128,115,172, 0.8)',
            'rgb(84,39,136, 0.9)',
            'rgb(45,0,75, 1.0)'
        ],
        'RdGy': [
            'rgb(103,0,31, 0.0)',
            'rgb(178,24,43, 0.1)',
            'rgb(214,96,77, 0.2)',
            'rgb(244,165,130, 0.3)',
            'rgb(253,219,199, 0.4)',
            'rgb(255,255,255, 0.5)',
            'rgb(224,224,224, 0.6)',
            'rgb(186,186,186, 0.7)',
            'rgb(135,135,135, 0.8)',
            'rgb(77,77,77, 0.9)',
            'rgb(26,26,26, 1.0)'
        ]
    },
    selectedColorMap: 'VsSurf-1' as ColorMapKey
}

const PlotSlice = createSlice({
    name: 'plot',
    initialState,
    reducers: {
        setSelectedColorMap: (state, action: PayloadAction<ColorMapKey>) => {
            state.selectedColorMap = action.payload
        },
        updateColorMap: (state, action: PayloadAction<{ [key: string]: string[] }>) => {
            state.colorMaps = { ...state.colorMaps, ...action.payload }
        },
    }
})

export const { setSelectedColorMap, updateColorMap } = PlotSlice.actions;
export default PlotSlice.reducer;
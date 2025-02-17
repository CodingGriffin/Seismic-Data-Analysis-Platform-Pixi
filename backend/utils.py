import os
import re

import numpy as np
import pandas as pd
import segyio


def get_data_from_excel(excel_path):
    xf = pd.ExcelFile(excel_path)
    sheet_names = xf.sheet_names
    sheet_name_regex = re.compile("^Station Coords - N X Y Z[w+a-zA-Z0-9]*")
    candidate_sheet_names = [x for x in sheet_names if sheet_name_regex.search(x)]
    sheet_name = None
    if len(candidate_sheet_names) == 0:
        raise ValueError("No valid sheet names found.")
    elif len(candidate_sheet_names) >= 1:
        sheet_name = candidate_sheet_names[0]
    df = xf.parse(sheet_name=sheet_name, header=2)
    headers = df.columns.values.tolist()
    if headers[0] != "Phone":
        raise ValueError("Headers do not match expected value.")
    x_header = headers[1]
    y_header = headers[2]
    z_header = headers[3]
    x_points = df[x_header]
    y_points = df[y_header]
    z_points = df[z_header]
    return x_points, y_points, z_points


def get_sheets_from_excel(excel_path):
    xf = pd.ExcelFile(excel_path)
    sheet_names = xf.sheet_names
    return sheet_names


def get_geometry_from_excel(excel_path):
    # Get raw points
    x_points, y_points, z_points = get_data_from_excel(excel_path)

    # Format as list of dicts for return
    return [
        {
            "index": idx,
            "x": float(x_points[idx]),
            "y": float(y_points[idx]),
            "z": float(z_points[idx]),
        } for idx in range(len(x_points))
    ]


def close_and_remove_file(path: str):
    def local_close():
        os.remove(path)

    return local_close


def parse_trace_headers(segyfile, n_traces):
    '''
    Taken from https://github.com/equinor/segyio-notebooks/blob/master/notebooks/basic/02_segy_quicklook.ipynb

    Parse the segy file trace headers into a pandas dataframe.
    Column names are defined from segyio internal tracefield
    One row per trace
    '''
    # Get all header keys
    headers = segyio.tracefield.keys
    # Initialize dataframe with trace id as index and headers as columns
    df = pd.DataFrame(index=range(1, n_traces + 1),
                      columns=headers.keys())
    # Fill dataframe with all header values
    for k, v in headers.items():
        df[k] = segyfile.attributes(v)[:]
    return df


def get_geometry_from_sgy(segyfile):
    with segyio.open(segyfile, ignore_geometry=True) as f:
        n_traces = f.tracecount
        trace_headers = parse_trace_headers(f, n_traces)
        source_group_scalar = np.abs(trace_headers['SourceGroupScalar'])
        x_points = (trace_headers['GroupX'] / source_group_scalar)
        y_points = trace_headers['GroupY'] / source_group_scalar
        elevation_scalar = np.abs(trace_headers['ElevationScalar'])
        z_points = trace_headers['ReceiverGroupElevation'] / elevation_scalar

    # Format as list of dicts for return
    return [
        {
            "index": idx,
            "x": float(x_points.iloc[idx]),
            "y": float(y_points.iloc[idx]),
            "z": float(z_points.iloc[idx]),
        } for idx in range(len(x_points))
    ]
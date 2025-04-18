import io
import logging
import os
import tempfile
from time import sleep
from typing import List, Annotated

import aiofiles
import aiofiles.os as aios
import numpy as np

from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Request, status, Form, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.responses import FileResponse

from utils import close_and_remove_file, get_sheets_from_excel, get_geometry_from_sgy
from utils import get_geometry_from_excel
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union
import json

app = FastAPI()
CHUNK_SIZE = 1024 * 1024  # adjust the chunk size as desired

origins = [
    "http://localhost:*",
    # Adjust the port if your frontend runs on a different one
    # "https://yourfrontenddomain.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # origins,  # Allows all origins from the list
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# data models
class GeometryItem(BaseModel):
    x: float
    y: float
    z: float
    index: Union[str, int]  # Accept either string or integer

class PlotLimits(BaseModel):
    numFreq: int
    maxFreq: float
    numSlow: int
    maxSlow: float

class VelocityLayer(BaseModel):
    startDepth: float
    endDepth: float
    velocity: float
    density: float
    ignore: int

class VelocityModel(BaseModel):
    layers: List[VelocityLayer]

class RecordOption(BaseModel):
    id:str
    enabled: bool
    weight: float
    fileName: str

class PickData(BaseModel):
    d1: float
    d2: float
    frequency: float
    d3: float
    slowness: float
    d4: float
    d5: float
class Grid(BaseModel):
    name: str
    data: list
    shape: list
    
class OptionsModel(BaseModel):
    geometry: List[GeometryItem]
    records: List[RecordOption]
    plotLimits: PlotLimits

# In-memory storage (in a real app, use a database)
project_data = {}

# Initialize project data structure if it doesn't exist
def init_project(project_id: str):
    if project_id not in project_data:
        project_data[project_id] = {
            "geometry": [],
            "records":[],
            "plotLimits": {
                "numFreq": 50,
                "maxFreq": 50,
                "numSlow": 50,
                "maxSlow": 0.015
            },
            "freq":[],
            "slow":[],
            "grids":[],
            "picks":[],
            "model": {
                "layers": [
                    { "startDepth": 0.0, "endDepth": 30.0, "velocity": 760.0, "density": 2.0, "ignore": 0 },
                    { "startDepth": 30.0, "endDepth": 44.0, "velocity": 1061.0, "density": 2.0, "ignore": 0 },
                    { "startDepth": 44.0, "endDepth": 144.0, "velocity": 1270.657, "density": 2.0, "ignore": 0 },
                ]
            },
        }
    return project_data[project_id]

dummy_freq_data = np.load("small_freq_0.npy")
dummy_slow_data = np.load("small_slow_0.npy")
dummy_grid_data = np.load("small_grid_0.npy")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    exc_str = f'{exc}'.replace('\n', ' ').replace('   ', ' ')
    logging.error(f"{request}: {exc_str}")
    content = {'status_code': 10422, 'message': exc_str, 'data': None}
    return JSONResponse(content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/extractExcel")
async def get_elevation_from_excel_endpoint(
        background_tasks: BackgroundTasks,
        excel_file: UploadFile = File(...),
):
    file_name = excel_file.filename
    split = file_name.split('.')
    if len(split) <= 1:
        raise HTTPException(400, "No file extension found.")
    extension = "." + file_name.split('.')[-1]
    try:
        fd, path = tempfile.mkstemp(suffix=extension)
        async with aiofiles.open(path, 'wb') as f:
            while chunk := await excel_file.read(CHUNK_SIZE):
                await f.write(chunk)
            os.close(fd)
            await f.flush()
            await f.close()
        with open(path, 'rb') as f:
            buffer = io.BytesIO(f.read())
            geometry_list = get_geometry_from_excel(buffer)
        background_tasks.add_task(close_and_remove_file(path))

    except Exception as e:
        print(e)
        raise HTTPException(400, "Failed to parse excel file.")
    return geometry_list


@app.post("/extractExcelSheets")
async def get_sheets_from_excel_endpoint(
        background_tasks: BackgroundTasks,
        excel_file: UploadFile = File(...),
):
    file_name = excel_file.filename
    split = file_name.split('.')
    if len(split) <= 1:
        raise HTTPException(400, "No file extension found.")
    extension = "." + file_name.split('.')[-1]
    try:
        fd, path = tempfile.mkstemp(suffix=extension)
        async with aiofiles.open(path, 'wb') as f:
            while chunk := await excel_file.read(CHUNK_SIZE):
                await f.write(chunk)
            os.close(fd)
            await f.flush()
            await f.close()
        with open(path, 'rb') as f:
            buffer = io.BytesIO(f.read())
            sheets_list = get_sheets_from_excel(buffer)
        background_tasks.add_task(close_and_remove_file(path))

    except Exception as e:
        print(e)
        raise HTTPException(400, "Failed to parse excel file.")
    return sheets_list


@app.post("/extractSgyGeom")
async def get_geometry_from_sgy_endpoint(
        background_tasks: BackgroundTasks,
        sgy_file: UploadFile = File(...),
):
    file_name = sgy_file.filename
    split = file_name.split('.')
    if len(split) <= 1:
        raise HTTPException(400, "No file extension found.")
    extension = "." + file_name.split('.')[-1]
    try:
        fd, path = tempfile.mkstemp(suffix=extension)
        async with aiofiles.open(path, 'wb') as f:
            while chunk := await sgy_file.read(CHUNK_SIZE):
                await f.write(chunk)
            os.close(fd)
            await f.flush()
            await f.close()
        geometry = get_geometry_from_sgy(path)
        background_tasks.add_task(close_and_remove_file(path))

    except Exception as e:
        print("Exception")
        print(e)
        raise HTTPException(400, "Failed to parse sgy file.")
    return geometry

#grids endpoint
@app.post("/project/{project_id}/grids")
async def dummy_grids_save(
        project_id:str,
        background_tasks: BackgroundTasks,
        sgy_files: Annotated[list[UploadFile], File(...)],
        geometry_data: Annotated[str, Form(...)],  # Format as json
        max_slowness: Annotated[float, Form(...)],
        max_frequency: Annotated[float, Form(...)],
        num_slow_points: Annotated[int, Form(...)],
        num_freq_points: Annotated[int, Form(...)],
        return_freq_and_slow: Annotated[bool, Form(...)] = True,
):
    # if return_freq_and_slow:
    #     kwargs_savez = {
    #         "freq": dummy_freq_data,
    #         "slow": dummy_slow_data,
    #     }
    # else:
    #     kwargs_savez = {}

    # # When actually implemented, generate grids for them here
    # for i, _ in enumerate(sgy_files):
    #     kwargs_savez["grid_" + str(i)] = dummy_grid_data

    # # A couple thoughts on how to return this
    # # - As an npz, saved as a temporary file. Either uncompressed or compressed
    # # - As 1 or more npy files zipped together
    # # - As json data

    # return "No return yet"
    # Prepare response data
    response_data = {
        "data": {
            "grids": []
        }
    }
    
    # Add frequency and slowness data if requested
    if return_freq_and_slow:
        response_data["data"]["freq"] = {
            "data": dummy_freq_data.tolist(),
        }
        response_data["data"]["slow"] = {
            "data": dummy_slow_data.tolist(),
        }
        
        project_data[project_id]["freq"] = response_data["data"]["freq"]
        project_data[project_id]["slow"] = response_data["data"]["slow"]
    
    # Add grid data for each sgy file as array elements
    for i, sgy_file in enumerate(sgy_files):
        response_data["data"]["grids"].append({
            "name": sgy_file.filename,
            "data": dummy_grid_data.tolist(),
            "shape": dummy_grid_data.shape
        })
        
    project_data[project_id]["grids"] = response_data["data"]["grids"]
    
    return response_data

@app.get("/project/{project_id}/grids")
async def dummy_grids_get(project_id: str, return_freq_and_slow = True):
    project = init_project(project_id)
    response_data = {
        "data": {
            "grids": project["grids"]
        }
    }
    
    # Add frequency and slowness data if requested
    if return_freq_and_slow:
        response_data["data"]["freq"] = {
            "data": project["freq"],
        }
        response_data["data"]["slow"] = {
            "data": project["slow"],
        }
    
    return response_data


@app.post("/process/grid")
async def dummy_grid_endpoint(
        background_tasks: BackgroundTasks,
        sgy_file: Annotated[UploadFile, File(...)],
        geometry_data: Annotated[str, Form(...)],  # Format as json
        max_slowness: Annotated[float, Form(...)],
        max_frequency: Annotated[float, Form(...)],
        num_slow_points: Annotated[int, Form(...)],
        num_freq_points: Annotated[int, Form(...)],
):
    # Alternate version - only return a single grid
    # with tempfile.NamedTemporaryFile(suffix=".npy", delete=False) as temp_file:
    #     # Get the temporary file path
    #     temp_file_path = temp_file.name

    #     # Save the NumPy array to the temporary file
    #     np.save(temp_file_path, dummy_grid_data)

    # #TODO: Properly handle deleting the tempfile using background_tasks
    # return FileResponse(
    #     path=temp_file_path,
    # )
    # Prepare response data
    response_data = {
        # "metadata": {
        #     "max_slowness": max_slowness,
        #     "max_frequency": max_frequency,
        #     "num_slow_points": num_slow_points,
        #     "num_freq_points": num_freq_points
        # },
        "data": {
            "grid": {
                "name": sgy_file.filename,
                "data": dummy_grid_data.tolist(),
                "shape": dummy_grid_data.shape
            },
            # "freq": {
            #     "data": dummy_freq_data.tolist(),
            # },
            # "slow": {
            #     "data": dummy_slow_data.tolist(),
            # }
        }
    }
    
    return response_data

@app.post("/process/frequency_with_sgy")
async def dummy_freq_endpoint_from_sgy(
        background_tasks: BackgroundTasks,
        sgy_file: Annotated[UploadFile, File(...)],
        max_frequency: Annotated[float, Form(...)],
        num_freq_points: Annotated[int, Form(...)],
):
    # Alternate version - only return a single grid
    with tempfile.NamedTemporaryFile(suffix=".npy", delete=False) as temp_file:
        # Get the temporary file path
        temp_file_path = temp_file.name

        # Save the NumPy array to the temporary file
        np.save(temp_file_path, dummy_freq_data)

    #TODO: Properly handle deleting the tempfile using background_tasks
    return FileResponse(
        path=temp_file_path,
    )

@app.post("/process/frequency_with_params")
async def dummy_freq_endpoint_from_sgy(
        background_tasks: BackgroundTasks,
        n_samples: Annotated[int, Form(...)],
        sample_rate: Annotated[float, Form(...)],
        max_frequency: Annotated[float, Form(...)],
        num_freq_points: Annotated[int, Form(...)],
):
    # Alternate version - only return a single grid
    with tempfile.NamedTemporaryFile(suffix=".npy", delete=False) as temp_file:
        # Get the temporary file path
        temp_file_path = temp_file.name

        # Save the NumPy array to the temporary file
        np.save(temp_file_path, dummy_freq_data)

    #TODO: Properly handle deleting the tempfile using background_tasks
    return FileResponse(
        path=temp_file_path,
    )

@app.post("/process/frequency_with_params")
async def dummy_freq_endpoint_from_sgy(
        background_tasks: BackgroundTasks,
        max_slow: Annotated[float, Form(...)],
        num_slow_points: Annotated[int, Form(...)],
):
    # Alternate version - only return a single grid
    with tempfile.NamedTemporaryFile(suffix=".npy", delete=False) as temp_file:
        # Get the temporary file path
        temp_file_path = temp_file.name

        # Save the NumPy array to the temporary file
        np.save(temp_file_path, dummy_slow_data)

    #TODO: Properly handle deleting the tempfile using background_tasks
    return FileResponse(
        path=temp_file_path,
    )

# Geometry endpoints
# @app.get("/project/{project_id}/geometry")
# async def get_geometry(project_id: str):
#     project = init_project(project_id)
#     return {"geometry": project["geometry"]}

# @app.post("/project/{project_id}/geometry")
# async def save_geometry(project_id: str, geometry: List[GeometryItem]):
#     project = init_project(project_id)
#     project["geometry"] = [item.dict() for item in geometry]
#     return {"status": "success", "count": len(geometry)}

# # Plot limits endpoints
# @app.get("/project/{project_id}/pickPlotLimits")
# async def get_plot_limits(project_id: str):
#     project = init_project(project_id)
#     return project["plotLimits"]

# @app.post("/project/{project_id}/pickPlotLimits")
# async def save_plot_limits(project_id: str, limits: PlotLimits):
#     project = init_project(project_id)
#     project["plotLimits"] = limits.dict()
#     return {"status": "success"}

# model endpoints
@app.get("/project/{project_id}/model")
async def get_velocity_model(project_id: str):
    project = init_project(project_id)
    return project["model"]

@app.post("/project/{project_id}/model")
async def save_velocity_model(project_id: str, model: VelocityModel):
    project = init_project(project_id)
    project["model"] = model.dict()
    return {"status": "success"}

#pick data endpoints
@app.get("/project/{project_id}/options")
async def get_options(project_id:str):
    project = init_project(project_id)
    response_data = {}
    response_data["geometry"] = project["geometry"]
    response_data["records"] = project["records"]
    response_data["plotLimits"] = project["plotLimits"]
    
    return response_data

@app.post("/project/{project_id}/options")
async def save_options(project_id: str, options: OptionsModel):
    project = init_project(project_id)
    project["geometry"] = options.geometry
    project["records"] = options.records
    project["plotLimits"] = options.plotLimits
    return {"status": "success"}

#pick data endpoint
@app.post("/project/{project_id}/picks")
async def save_picks(project_id: str, picks: List[PickData]):
    project = init_project(project_id)
    project["picks"] = [item.dict() for item in picks]
    return {"status": "success", "count": len(picks)}

@app.get("/project/{project_id}/picks")
async def get_picks(project_id:str):
    project = init_project(project_id)
    return project["picks"]

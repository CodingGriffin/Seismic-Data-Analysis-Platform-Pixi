import io
import logging
import os
import tempfile
from time import sleep
from typing import List, Annotated

import aiofiles
import aiofiles.os as aios
import numpy as np

from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Request, status, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.responses import FileResponse

from backend.utils import close_and_remove_file, get_sheets_from_excel, get_geometry_from_sgy
from backend.utils import get_geometry_from_excel

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


@app.post("/process/grids")
async def dummy_grids_endpoint(
        background_tasks: BackgroundTasks,
        sgy_files: Annotated[list[UploadFile], File(...)],
        geometry_data: Annotated[str, Form(...)],  # Format as json
        max_slowness: Annotated[float, Form(...)],
        max_frequency: Annotated[float, Form(...)],
        num_slow_points: Annotated[int, Form(...)],
        num_freq_points: Annotated[int, Form(...)],
        return_freq_and_slow: Annotated[bool, Form(...)] = True,
):
    # As part of the processing, we need to generate the freq and slow arrays here anyways.
    # Not sure if it's better to return everything together, or just one.

    # For now just return the small grid sample data
    if return_freq_and_slow:
        kwargs_savez = {
            "freq": dummy_freq_data,
            "slow": dummy_slow_data,
        }
    else:
        kwargs_savez = {}

    # When actually implemented, generate grids for them here
    for i, _ in enumerate(sgy_files):
        kwargs_savez["grid_" + str(i)] = dummy_grid_data

    # A couple thoughts on how to return this
    # - As an npz, saved as a temporary file. Either uncompressed or compressed
    # - As 1 or more npy files zipped together
    # - As json data

    return "No return yet"

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
    with tempfile.NamedTemporaryFile(suffix=".npy", delete=False) as temp_file:
        # Get the temporary file path
        temp_file_path = temp_file.name

        # Save the NumPy array to the temporary file
        np.save(temp_file_path, dummy_grid_data)

    #TODO: Properly handle deleting the tempfile using background_tasks
    return FileResponse(
        path=temp_file_path,
    )

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

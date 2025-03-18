import { Input } from "../../../components/Input/Input";
import { useAppDispatch } from "../../../hooks/useAppDispatch";
import { useAppSelector } from "../../../hooks/useAppSelector";
import { setMaxFreq, setNumFreq } from "../../../store/slices/freqSlice";
import { setMaxSlow, setNumSlow } from "../../../store/slices/slowSlice";

export const FreqSlowManger = () => {
  const dispatch = useAppDispatch();
  const {numFreq, maxFreq} = useAppSelector((state) => state.freq)
  const {numSlow, maxSlow} = useAppSelector((state) => state.slow)

  return (
    <div className="container mt-5 flex-1">
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="d-flex align-items-center">
            <label className="me-3 w-50 text-end">Number of Frequency Points:</label>
            <Input
              type="number"
              value={numFreq}
              onChange={(value) => dispatch(setNumFreq(parseInt(value)))}
              className="flex-grow-1"
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="d-flex align-items-center">
            <label className="me-3 w-50 text-end">Number of Slowness Points:</label>
            <Input
              type="number"
              value={numSlow}
              onChange={(value) => dispatch(setNumSlow(parseInt(value)))}
              className="flex-grow-1"
            />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <div className="d-flex align-items-center">
            <label className="me-3 w-50 text-end">Max Frequency:</label>
            <Input
              type="number"
              value={maxFreq}
              onChange={(value) => dispatch(setMaxFreq(parseFloat(value)))}
              className="flex-grow-1"
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="d-flex align-items-center">
            <label className="me-3 w-50 text-end">Max Slow:</label>
            <Input
              type="number"
              value={maxSlow}
              onChange={(value) => dispatch(setMaxSlow(parseFloat(value)))}
              className="flex-grow-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
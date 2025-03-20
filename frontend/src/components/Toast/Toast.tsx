import { useEffect } from "react";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { useAppSelector } from "../../hooks/useAppSelector";
import { removeToast, ToastType } from "../../store/slices/toastSlice";
import "./Toast.scss";

export const Toast = () => {
  const dispatch = useAppDispatch();
  const { messages } = useAppSelector((state) => state.toast);

  const getToastClass = (type: ToastType): string => {
    switch (type) {
      case "success":
        return "bg-success";
      case "error":
        return "bg-danger";
      case "warning":
        return "bg-warning text-dark";
      case "info":
      default:
        return "bg-info";
    }
  };

  useEffect(() => {
    messages.forEach((toast) => {
      const timer = setTimeout(() => {
        dispatch(removeToast(toast.id));
      }, toast.duration);

      return () => clearTimeout(timer);
    });
  }, [messages, dispatch]);

  if (messages.length === 0) return null;

  return (
    <div className="toast-container position-fixed top-0 end-0 p-3">
      {messages.map((toast) => (
        <div
          key={toast.id}
          className={`toast align-items-center text-white ${getToastClass(toast.type)} border-0 show`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="d-flex">
            <div className="toast-body">
              {toast.message}
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white me-2 m-auto" 
              onClick={() => dispatch(removeToast(toast.id))}
              aria-label="Close"
            ></button>
          </div>
        </div>
      ))}
    </div>
  );
};

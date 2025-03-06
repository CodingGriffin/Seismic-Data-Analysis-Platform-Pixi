interface ErrorTipProps {
  message: string | null;
}

export function ErrorTip({ message }: ErrorTipProps) {
  if (!message) return null;

  return (
    <div className="text-sm text-red-600 mt-1">
      {message}
    </div>
  );
}
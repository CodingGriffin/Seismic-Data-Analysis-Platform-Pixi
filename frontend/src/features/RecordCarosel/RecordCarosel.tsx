"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import RecordCard from "./RecordCard/RecordCard";
import { RecordItem } from "../../types/record";

const CARD_WIDTH = 200;
const CARD_MARGIN = 10;
const TOTAL_CARD_WIDTH = CARD_WIDTH + CARD_MARGIN * 2;

interface RecordCarouselProps {
  records: { [key: string]: RecordItem };
  orderedIds: string[];
  onToggleSelection: (id: string, event: React.MouseEvent) => void;
  onSliderChange: (id: string, value: number) => void;
  scrollToRecordId?: string | null;
}

const RecordCarousel: React.FC<RecordCarouselProps> = ({
  records,
  orderedIds,
  onToggleSelection,
  onSliderChange,
  scrollToRecordId,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [perpage, setPerpage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [current, setCurrent] = useState(0);
  const isScrolling = useRef(false);

  const calculateBlankItems = useCallback(() => {
    const totalItems = orderedIds.length;
    const remainingItems = totalItems % perpage;
    return remainingItems === 0 ? 0 : perpage - remainingItems;
  }, [orderedIds.length, perpage]);

  const extendedOrderedIds = [
    ...orderedIds,
    ...Array(calculateBlankItems()).fill("blank"),
  ];

  const scrollToPage = useCallback((pageIndex: number) => {
    setCurrent(pageIndex);
    isScrolling.current = true;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: pageIndex * TOTAL_CARD_WIDTH * perpage,
        behavior: "smooth",
      });
    }
    setTimeout(() => {
      isScrolling.current = false;
    }, 300);
  }, [perpage]);

  const updateDimensions = useCallback(() => {
    if (scrollContainerRef.current) {
      const width = scrollContainerRef.current.clientWidth;
      const newPerPage = Math.max(1, Math.floor(width / TOTAL_CARD_WIDTH));
      setPerpage(newPerPage);
      setPageCount(Math.ceil(extendedOrderedIds.length / newPerPage));
    }
  }, [extendedOrderedIds.length]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
    setPageCount(Math.ceil(extendedOrderedIds.length / perpage));
  }, [perpage, extendedOrderedIds.length]);

  useEffect(() => {
    if (scrollToRecordId && scrollContainerRef.current) {
      const recordIndex = orderedIds.findIndex((r) => r === scrollToRecordId);
      if (recordIndex >= 0) {
        const pageIndex = Math.floor(recordIndex / perpage);
        scrollToPage(pageIndex);
      }
    }
  }, [scrollToRecordId, orderedIds, perpage, scrollToPage]);

  const handleScroll = useCallback(() => {
    if (isScrolling.current) return; 

    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const newVisibleIndex = Math.round(scrollLeft / TOTAL_CARD_WIDTH);
      const newPage = Math.floor(newVisibleIndex / perpage);

      if (newPage !== current) {
        setCurrent(newPage);
      }

      if (newVisibleIndex !== visibleIndex) {
        setVisibleIndex(newVisibleIndex);
      }
    }
  }, [perpage, visibleIndex, current]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const scrollNext = () => scrollToPage(Math.min(pageCount - 1, current + 1));
  const scrollPrev = () => scrollToPage(Math.max(0, current - 1));

  return (
    <div className="position-relative border-primary px-1">
      {orderedIds.length === 0 ? (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "200px" }}
        >
          <h5 className="text-muted">No records available</h5>
        </div>
      ) : (
        <>
          <div
            ref={scrollContainerRef}
            className="d-flex overflow-auto h-100"
            style={{
              scrollBehavior: "smooth",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {extendedOrderedIds.map((recordId, index) =>
              recordId === "blank" ? (
                <div
                  key={`blank-${index}`}
                  style={{
                    minWidth: `${CARD_WIDTH}px`,
                    width: `${CARD_WIDTH}px`,
                    margin: `0 ${CARD_MARGIN}px`,
                    height: "100%",
                    visibility: "hidden",
                  }}
                />
              ) : (
                <div
                  key={recordId}
                  style={{
                    minWidth: `${CARD_WIDTH}px`,
                    width: `${CARD_WIDTH}px`,
                    margin: `0 ${CARD_MARGIN}px`,
                    height: "100%",
                  }}
                >
                  <RecordCard
                    id={recordId}
                    record={records[recordId]}
                    onToggleSelection={onToggleSelection}
                    onSliderChange={onSliderChange}
                  />
                </div>
              )
            )}
          </div>
          <button
            className="btn btn-primary position-absolute top-50 start-0 translate-middle-y"
            style={{ zIndex: 10, opacity: current > 0 ? 0.8 : 0.3 }}
            onClick={scrollPrev}
            disabled={current === 0}
          >
            &laquo;
          </button>
          <button
            className="btn btn-primary position-absolute top-50 end-0 translate-middle-y"
            style={{ zIndex: 10, opacity: current < pageCount - 1 ? 0.8 : 0.3 }}
            onClick={scrollNext}
            disabled={current >= pageCount - 1}
          >
            &raquo;
          </button>
          <div className="d-flex justify-content-center mt-1">
            {Array.from({ length: pageCount }).map((_, index) => (
              <button
                key={index}
                className={`btn btn-sm rounded-circle mx-1 ${
                  current === index ? "btn-primary" : "btn-outline-primary"
                }`}
                style={{
                  width: "24px",
                  height: "24px",
                  fontSize: "10px",
                  padding: "0",
                }}
                onClick={() => scrollToPage(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RecordCarousel;

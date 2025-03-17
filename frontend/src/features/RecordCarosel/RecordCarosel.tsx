"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
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
  const [perpage, setPerpage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [current, setCurrent] = useState(0);

  const scrollNext = () => {
    setCurrent((prev) => Math.min(pageCount, prev + 1));
  };

  const scrollPrev = () => {
    setCurrent((prev) => Math.max(0, prev - 1));
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const newVisibleIndex = Math.floor(scrollLeft / TOTAL_CARD_WIDTH);
      if (newVisibleIndex !== visibleIndex) {
        setVisibleIndex(newVisibleIndex);
      }
    }
  };

  useEffect(() => {
    if (scrollToRecordId && scrollContainerRef.current) {
      const recordIndex = orderedIds.findIndex((r) => r === scrollToRecordId);
      if (recordIndex >= 0) {
        scrollContainerRef.current.scrollTo({
          left: recordIndex * TOTAL_CARD_WIDTH,
          behavior: "smooth",
        });
      }
    }
  }, [scrollToRecordId, orderedIds]);

  useEffect(() => {
    console.log("Visible Index:", visibleIndex);
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => {
        container.removeEventListener("scroll", handleScroll);
      };
    }
  }, [visibleIndex]);

  useEffect(() => {
    scrollContainerRef.current &&
      setContainerWidth(scrollContainerRef.current?.clientWidth);
    window.addEventListener("resize", () => {
      scrollContainerRef.current &&
        setContainerWidth(scrollContainerRef.current.clientWidth);
    });
  }, [orderedIds, scrollContainerRef.current]);

  useEffect(() => {
    if (containerWidth) {
      console.log("Valid containerWidth:", containerWidth);
      setPerpage(Math.floor(containerWidth / TOTAL_CARD_WIDTH));
    }
  }, [containerWidth]);

  useEffect(() => {
    console.log("Perpage:", perpage);
    setPageCount(Math.ceil(orderedIds.length / perpage));
  }, [perpage]);

  useEffect(() => {
    console.log("current:", current)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: current * TOTAL_CARD_WIDTH * perpage,
        behavior: "smooth",
      });
    }
  }, [current]);

  const canScrollPrev = visibleIndex > 0;
  const canScrollNext = scrollContainerRef.current
    ? scrollContainerRef.current.scrollWidth -
        scrollContainerRef.current.clientWidth >
      scrollContainerRef.current.scrollLeft
    : false;

  return (
    <div className="position-relative border-primary px-1">
      <div
        ref={scrollContainerRef}
        className="d-flex overflow-auto h-100"
        style={{
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {orderedIds.map((recordId) => (
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
        ))}
        {orderedIds && (
          <div
            style={{
              minWidth: `${containerWidth - TOTAL_CARD_WIDTH}px`,
              width: `${containerWidth - TOTAL_CARD_WIDTH}px`,
              height: "100%",
            }}
          ></div>
        )}
      </div>

      <button
        className="btn btn-primary position-absolute top-50 start-0 translate-middle-y"
        style={{ zIndex: 10, opacity: canScrollPrev ? 0.8 : 0.3 }}
        onClick={scrollPrev}
        disabled={!canScrollPrev}
      >
        &laquo;
      </button>
      <button
        className="btn btn-primary position-absolute top-50 end-0 translate-middle-y"
        style={{
          zIndex: 10,
          opacity: canScrollNext ? 0.8 : 0.3,
        }}
        onClick={scrollNext}
        disabled={!canScrollNext}
      >
        &raquo;
      </button>

      {scrollContainerRef.current && (
        <div className="d-flex justify-content-center mt-1">
          {Array.from({
            length: pageCount,
          }).map((_, index) => (
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
              onClick={() => {
                if (scrollContainerRef.current) {
                  setCurrent(index);
                  scrollContainerRef.current.scrollTo({
                    left: index * perpage * TOTAL_CARD_WIDTH,
                    behavior: "smooth",
                  });
                }
              }}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecordCarousel;

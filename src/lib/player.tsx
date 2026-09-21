      <div
        className={cn(
          "z-30",
          mode === "docked" && "relative w-full",
          mode === "mini" &&
            "fixed bottom-[4.6rem] right-4 z-[95] w-[min(20rem,calc(100vw-2rem))] lg:bottom-4",
          mode === "hidden" &&
            "pointer-events-none fixed left-[-9999px] top-[-9999px] w-72 opacity-0",
        )}
      >
        {/* Container căn giữa — chỉ có tác dụng bố cục ở chế độ dock.
            Chế độ khác dùng display:contents để node vẫn tồn tại. */}
        <div
          className={cn(
            mode === "docked"
              ? "mx-auto w-full max-w-5xl overflow-hidden"
              : "contents",
          )}
        >

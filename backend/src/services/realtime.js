let ioInstance;

export const setSocketServer = (io) => { ioInstance = io; };

export const emitShopEvent = (shopId, event, payload) => {
  if (!ioInstance || !shopId) return;
  ioInstance.to(`shop:${shopId}`).emit(event, payload);
};

export const emitRoomEvent = (room, event, payload) => {
  if (!ioInstance || !room) return;
  ioInstance.to(room).emit(event, payload);
};

export const closeSocketServer = async () => {
  if (!ioInstance) return;
  await new Promise((resolve, reject) => {
    ioInstance.close((error) => (error ? reject(error) : resolve()));
  });
  ioInstance = null;
};

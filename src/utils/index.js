export const removeAllObjects = (obj) => {
  let newObj = { ...obj };
  let objKeys = Object.keys(obj);
  Object.values(obj).forEach((item, index) => {
    if (typeof item === "object") {
      delete newObj[objKeys[index]];
    }
  });
  return newObj;
};

export const calcCoordsFromRect = (rect) => {
  const width = rect.width;
  const height = rect.height;
  const left = rect.left;
  const top = rect.top;

  const btnCoordX = parseInt(left) + parseInt(width) / 4;
  const btnCoordY = parseInt(top) + parseInt(height) / 4;
  return { left: btnCoordX, top: btnCoordY };
};

export const getFourthValue = (x1, x2, y1) => {
  const divisor = parseInt(x2 * y1);
  const dividend = x1;
  const output = divisor / dividend;
  return output;
};

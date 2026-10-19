// 模擬的承包廠商：依行政區分包，所以每個案件、每張工單都對得到一家廠商（模擬資料）。

export interface Vendor {
  id: string
  name: string
  districts: string[]
}

export const VENDORS: Vendor[] = [
  { id: 'green-field', name: '綠野造園', districts: ['中正區', '大同區', '中山區', '松山區'] },
  { id: 'cool-shade', name: '蔭涼植栽', districts: ['大安區', '信義區', '萬華區', '士林區'] },
  { id: 'tree-doctor', name: '城市樹醫', districts: ['文山區', '內湖區', '南港區', '北投區'] },
]

export function vendorById(id: string | undefined): Vendor | undefined {
  return VENDORS.find((v) => v.id === id)
}

/** 這個行政區的承包廠商；沒有對應時（資料異常）歸第一家 */
export function vendorOfDistrict(district: string): Vendor {
  return VENDORS.find((v) => v.districts.includes(district)) ?? VENDORS[0]
}

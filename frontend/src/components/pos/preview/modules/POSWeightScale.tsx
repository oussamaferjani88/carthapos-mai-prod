import { Scale, Weight } from 'lucide-react';

export const POSWeightScale = ({ config }: { config: any }) => (
  <div className="p-6 max-w-md mx-auto">
    <h1 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: config.textColor }}>
      <Scale className="w-6 h-6" />Balance
    </h1>
    <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Weight className="w-12 h-12 text-gray-400" />
      </div>
      <div className="text-4xl font-bold font-mono" style={{ color: config.primaryColor }}>0.000</div>
      <p className="text-sm text-gray-500 mt-2">kg</p>
      <p className="text-xs text-gray-400 mt-4">Placez un article sur la balance</p>
    </div>
  </div>
);

export default POSWeightScale;

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_DENSITY_KG_PER_LITER, Quality } from '@eco-oil/shared-types';
import type { CollectionCreateRequest, ContainerLookupResponse, GeoPoint, OilGrade, OilImageAnalysisPayload, RouteStop } from '@eco-oil/shared-types';
import { formatLiters } from '../../lib/formatters';
import {
  evaluatePickupVolumeDeviation,
  formatPickupVolumeLiters,
  getPickupVolumeForecastDisplay,
  formatDeviationPercent,
  formatSignedDeviationLiters,
  getImageGradeAnalysisDisplay,
  getPickupVolumeDeviationKey,
  requiresPickupVolumeAcknowledgement,
} from '../../lib/collector-metrics';
import { resolveCollectionLocation } from '../../lib/collector-runtime';
import { enqueueCollection } from '../../lib/outbox-db';
import { syncOutbox } from '../../lib/outbox-sync';
import { getCollectionSubmitBlockReasons, parseLocalizedDecimal } from '../../lib/collection-entry-validation';
import { analyzeOilImages, type OilImageAnalysis } from '../../lib/oil-image-analyzer';
import { pickZaloPhoto } from '../../lib/media-picker';
import { compressImageBlob, zaloClient } from '../../lib/zalo-client';
import type { PhotoAsset } from '../../lib/zalo-client';
import { OilGradeSelector } from '../../components/OilGradeSelector';
import { GradePhotoPicker } from '../../components/GradePhotoPicker';
import { TechDetails } from '../../components/TechDetails';
import { EMPTY_MASS_ENTRY, editMassField, litersForDeviationCheck, massEntryView } from '../../lib/mass-entry';
import { aiPreselectGrade, isAiPreselected, resolveQuality } from '../../lib/grade-automation';
import { entryGpsStatus, requestEntryGps } from '../../lib/entry-gps';
import type { MassEntryState, MassField } from '../../lib/mass-entry';

export function CollectorEntryScreen({ stop, container, containerCode, onBack, onSuccess }: { stop: RouteStop; container: ContainerLookupResponse; containerCode: string; onBack: () => void; onSuccess: (liters: number, kilograms: number | null, clientUuid: string) => void }) {
  // Kg và lít để trống lúc đầu (Q14); ô nhập sau cùng là ô gốc, ô kia tự tính.
  const [massEntry, setMassEntry] = useState<MassEntryState>(EMPTY_MASS_ENTRY);
  // Chất lượng tự chọn theo hạng dầu (C5.2); chọn tay thì giữ lựa chọn của người dùng.
  const [manualQuality, setManualQuality] = useState<Quality | null>(null);
  const [grade, setGrade] = useState<OilGrade | null>(null);
  // Người thu gom đã tự chọn/đổi hạng thì AI không chọn sẵn nữa (C5.4).
  const [gradeTouched, setGradeTouched] = useState(false);
  // Bản ref để lệnh phân tích ảnh chạy nền đọc đúng giá trị mới nhất.
  const gradeTouchedRef = useRef(false);
  const [suspectedAdulteration, setSuspectedAdulteration] = useState(false);
  const [gradeNote, setGradeNote] = useState('');
  const { quality, isAuto: qualityAuto } = resolveQuality({ grade, suspectedAdulteration, manual: manualQuality });
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [imageAnalysis, setImageAnalysis] = useState<OilImageAnalysis | null>(null);
  const [analyzingImages, setAnalyzingImages] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);
  const [geo, setGeo] = useState<GeoPoint | null>(null);
  const [saving, setSaving] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [locationFallback, setLocationFallback] = useState(false);
  // Tự lấy GPS khi mở màn (C5.3).
  const [locating, setLocating] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [clientUuid] = useState(() => crypto.randomUUID());
  const [highDeviationAcknowledgement, setHighDeviationAcknowledgement] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const mediaPickerInFlightRef = useRef(false);
  const analysisRunRef = useRef(0);
  useEffect(() => () => {
    mountedRef.current = false;
    analysisRunRef.current += 1;
    zaloClient.cancelMediaPicker?.();
  }, []);
  useEffect(() => {
    // Đồng bộ với hệ thống bên ngoài (GPS của máy) một lần khi mở màn.
    let active = true;
    void requestEntryGps(() => zaloClient.getLocation()).then((result) => {
      if (!active) return;
      if (result.point) setGeo(result.point);
      setGpsError(result.error);
      setLocating(false);
    });
    return () => {
      active = false;
    };
  }, []);
  const gpsStatus = entryGpsStatus({ locating, hasGeo: geo !== null, error: gpsError, usedFallback: locationFallback });
  const capacity = Number(container.capacity_liters ?? 0);
  const mass = massEntryView(massEntry);
  const { enteredLiters, actualKg, hasLiters, hasKilograms, actualLiters } = mass;
  const litersDerivedFromKilograms = mass.litersAuto;
  const maxLiters = capacity * 1.1;
  const invalidLiters =
    actualLiters > maxLiters ||
    (enteredLiters !== null && (!Number.isFinite(enteredLiters) || enteredLiters <= 0));
  const invalidKg = actualKg !== null && (!Number.isFinite(actualKg) || actualKg < 0);
  const invalidMass = (!hasLiters && !hasKilograms) || invalidLiters || invalidKg;
  const pickupVolumeForecast = getPickupVolumeForecastDisplay(stop);
  const deviationLiters = litersForDeviationCheck(mass);
  const pickupVolumeDeviation = deviationLiters === null ? null : evaluatePickupVolumeDeviation(stop, deviationLiters);
  const highDeviationKey = getPickupVolumeDeviationKey(pickupVolumeDeviation);
  useEffect(() => {
    setHighDeviationAcknowledgement(null);
  }, [highDeviationKey]);
  const highDeviationNeedsAcknowledgement = requiresPickupVolumeAcknowledgement(pickupVolumeDeviation, highDeviationAcknowledgement);
  const imageGradeDisplay = getImageGradeAnalysisDisplay(imageAnalysis);
  const suggestedGrade = imageAnalysis?.suggested_grade ?? null;
  const needsImageGradeOverrideAcknowledgement = Boolean(
    grade && suggestedGrade && grade !== suggestedGrade && (imageAnalysis?.confidence === 'HIGH' || imageAnalysis?.confidence === 'MEDIUM'),
  );
  const imageGradeDecisionBlocked = needsImageGradeOverrideAcknowledgement && !overrideAcknowledged;
  const invalidLitersMessage = litersDerivedFromKilograms && invalidLiters
    ? `Số lít suy ra từ khối lượng (${actualLiters.toFixed(2)} lít) vượt dung tích cho phép ${maxLiters.toFixed(1)} lít.`
    : `Số lít phải lớn hơn 0 và không vượt ${maxLiters.toFixed(1)} lít.`;
  const submitBlockReasons = getCollectionSubmitBlockReasons({
    grade,
    quality,
    photoCount: photos.length,
    suspectedAdulteration,
    hasLiters,
    hasKilograms,
    invalidMass,
    invalidLitersMessage,
    highDeviationNeedsAcknowledgement,
    imageGradeDecisionBlocked,
  });

  function adjustMass(field: MassField, amount: number): void {
    const current = parseLocalizedDecimal(field === 'kg' ? mass.kgText : mass.litersText) || 0;
    setMassEntry((state) => editMassField(state, field, Math.max(0, current + amount).toFixed(1)));
  }

  async function analyzePhotos(nextPhotos: PhotoAsset[]): Promise<void> {
    const run = ++analysisRunRef.current;
    if (nextPhotos.length === 0) {
      if (mountedRef.current) {
        setImageAnalysis(null);
        if (!gradeTouchedRef.current) setGrade(null);
        setAnalysisError(null);
        setAnalyzingImages(false);
      }
      return;
    }
    setAnalyzingImages(true);
    setAnalysisError(null);
    setImageAnalysis(null);
    // Hạng do AI chọn sẵn chỉ đúng với ảnh cũ; người thu gom chưa tự chọn thì bỏ để chờ kết quả mới.
    if (!gradeTouchedRef.current) setGrade(null);
    try {
      const result = await analyzeOilImages(nextPhotos.map((item) => item.url));
      if (mountedRef.current && run === analysisRunRef.current) {
        setImageAnalysis(result);
        if (!gradeTouchedRef.current) setGrade(aiPreselectGrade(null, result));
      }
    } catch {
      if (mountedRef.current && run === analysisRunRef.current) {
        setAnalysisError('Không phân tích được ảnh. Bạn có thể thử lại hoặc chọn/chụp ảnh khác.');
        setImageAnalysis(null);
      }
    } finally {
      if (mountedRef.current && run === analysisRunRef.current) setAnalyzingImages(false);
    }
  }

  function addPhoto(photo: PhotoAsset): void {
    if (!photo.url.trim()) {
      throw new Error('Ảnh không hợp lệ');
    }
    const nextPhotos = [...photos, photo];
    setPhotos(nextPhotos);
    setOverrideAcknowledged(false);
    void analyzePhotos(nextPhotos);
  }

  async function takePhoto(): Promise<void> {
    if (mediaPickerInFlightRef.current) return;
    mediaPickerInFlightRef.current = true;
    setTakingPhoto(true);
    setError(null);
    setPhotoNotice(null);
    try {
      const result = await pickZaloPhoto('camera');
      if (!mountedRef.current) return;
      if (result.kind === 'selected') addPhoto(result.photo);
      else if (result.kind === 'cancelled') setPhotoNotice('Bạn chưa chọn ảnh. Bạn có thể thử lại hoặc chọn ảnh từ thư viện/file dự phòng.');
      else if (result.kind === 'permission-denied') setError('Zalo chưa có quyền Camera. Hãy bật quyền Camera hoặc dùng ảnh từ thư viện/file dự phòng.');
      else setError('Không mở được camera. Hãy dùng ảnh từ thư viện hoặc file dự phòng.');
    } finally {
      mediaPickerInFlightRef.current = false;
      if (mountedRef.current) setTakingPhoto(false);
    }
  }

  async function chooseAlbumPhoto(): Promise<void> {
    if (mediaPickerInFlightRef.current) return;
    mediaPickerInFlightRef.current = true;
    setTakingPhoto(true);
    setError(null);
    setPhotoNotice(null);
    try {
      const result = await pickZaloPhoto('album');
      if (!mountedRef.current) return;
      if (result.kind === 'selected') addPhoto(result.photo);
      else if (result.kind === 'cancelled') setPhotoNotice('Bạn chưa chọn ảnh. Bạn có thể thử lại hoặc chọn ảnh từ camera/file dự phòng.');
      else if (result.kind === 'permission-denied') setError('Zalo chưa được phép chọn ảnh. Hãy kiểm tra quyền hoặc dùng file dự phòng.');
      else setError('Không chọn được ảnh từ thư viện Zalo. Hãy dùng file dự phòng.');
    } finally {
      mediaPickerInFlightRef.current = false;
      if (mountedRef.current) setTakingPhoto(false);
    }
  }

  async function choosePhotoFile(file: File): Promise<void> {
    if (mediaPickerInFlightRef.current) return;
    mediaPickerInFlightRef.current = true;
    setTakingPhoto(true);
    setError(null);
    setPhotoNotice(null);
    try {
      const photo = await compressImageBlob(file);
      if (mountedRef.current) addPhoto(photo);
    } catch {
      if (mountedRef.current) setError('Không đọc được ảnh. Hãy chọn một ảnh khác.');
    } finally {
      mediaPickerInFlightRef.current = false;
      if (mountedRef.current) setTakingPhoto(false);
    }
  }

  function removePhoto(index: number): void {
    const nextPhotos = photos.filter((_, photoIndex) => photoIndex !== index);
    setPhotos(nextPhotos);
    setOverrideAcknowledged(false);
    void analyzePhotos(nextPhotos);
  }

  async function retryGps(): Promise<void> {
    if (locating || saving) return;
    setLocating(true);
    setGpsError(null);
    const result = await requestEntryGps(() => zaloClient.getLocation());
    if (!mountedRef.current) return;
    if (result.point) {
      setGeo(result.point);
      setLocationFallback(false);
    }
    setGpsError(result.error);
    setLocating(false);
  }

  async function submit(): Promise<void> {
    if (grade === null) {
      setError('Vui lòng chọn phân hạng dầu trước khi xác nhận.');
      return;
    }
    if (submitBlockReasons.length > 0) {
      setError(submitBlockReasons.join(' '));
      return;
    }
    if (saving || success) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let currentGeo = geo;
      if (!currentGeo) {
        const resolvedLocation = await resolveCollectionLocation(
          () => zaloClient.getLocation(stop.ward_center ?? null),
          stop.ward_center ?? null,
        );
        currentGeo = resolvedLocation.point;
        if (!currentGeo) {
          throw new Error('Không xác định được vị trí hiện tại hoặc tâm phường. Vui lòng bật GPS rồi thử lại.');
        }
        if (mountedRef.current) setLocationFallback(resolvedLocation.usedFallback);
        if (mountedRef.current) setGeo(currentGeo);
      }
      const payload: CollectionCreateRequest & {
      image_grade_suggestion: OilGrade | null;
      image_grade_confidence: OilImageAnalysis['confidence'] | null;
      image_grade_model_version: OilImageAnalysis['model_version'] | null;
      image_grade_analysis: OilImageAnalysisPayload | null;
      grade_decision_source: 'MANUAL' | 'AI_SUGGESTION_ACCEPTED' | 'MANUAL_OVERRIDE_AI';
      grade_ai_override_acknowledged: boolean;
      } = {
      client_uuid: clientUuid,
      order_id: stop.order_id,
       container_code: containerCode,
      ...(hasLiters ? { actual_liters: actualLiters } : {}),
      ...(actualKg === null ? {} : { actual_kg: actualKg }),
      quality,
      grade,
      // The API derives grade_photo_url from photos[0]; do not duplicate a Base64 image in JSON.
      ...(gradeNote.trim() ? { grade_note: gradeNote.trim() } : {}),
      suspected_adulteration: suspectedAdulteration,
      image_grade_suggestion: (imageAnalysis?.suggested_grade as OilGrade | null | undefined) ?? null,
      ai_suggested_grade: (imageAnalysis?.suggested_grade as OilGrade | null | undefined) ?? null,
      collector_selected_grade: grade,
      collector_grade_confirmed: true,
      image_grade_confidence: imageAnalysis?.confidence ?? null,
      image_grade_model_version: imageAnalysis?.model_version ?? null,
      image_grade_analysis: imageAnalysis
        ? { ...imageAnalysis, suggested_grade: imageAnalysis.suggested_grade as OilGrade | null }
        : null,
      grade_decision_source: imageAnalysis?.suggested_grade && grade === imageAnalysis.suggested_grade
        ? 'AI_SUGGESTION_ACCEPTED'
        : imageAnalysis?.suggested_grade && grade !== imageAnalysis.suggested_grade
          ? 'MANUAL_OVERRIDE_AI'
          : 'MANUAL',
      grade_ai_override_acknowledged: overrideAcknowledged,
      geo: currentGeo,
      photos: photos.map((photo) => photo.url),
      collected_at: new Date().toISOString(),
      };
      const saved = await enqueueCollection(payload);
      if (saved.client_uuid !== clientUuid || saved.status !== 'pending') {
        throw new Error('Không đọc lại được giao dịch vừa lưu trên máy.');
      }
      if (mountedRef.current) {
        setSuccess(true);
        void syncOutbox();
        window.setTimeout(() => {
          if (mountedRef.current) onSuccess(actualLiters, actualKg, clientUuid);
        }, 450);
      }
    } catch (submitError) {
      if (mountedRef.current) {
        setError(submitError instanceof Error && submitError.message.startsWith('Không xác định được vị trí')
          ? submitError.message
          : 'Không lưu được giao dịch trên máy. Dữ liệu chưa được ghi, vui lòng thử lại.');
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  if (success) {
    return <div className="success-screen"><div className="status-label">Đã ghi nhận</div><h1>Đã lưu an toàn</h1><p>{formatLiters(actualLiters)} {actualKg === null ? `(~${(actualLiters * DEFAULT_DENSITY_KG_PER_LITER).toFixed(1)} kg ước lượng)` : `· ${actualKg.toFixed(1)} kg đã cân`} · Giao dịch sẽ tự đồng bộ khi có mạng.</p></div>;
  }

  return (
    <div className="page-content collector-content collector-entry-screen">
      <button className="back-button" onClick={onBack} disabled={saving}>Quay lại quét mã</button>
       <header className="collector-screen-heading"><p className="eyebrow">GHI NHẬN THU GOM</p><h1>{container.merchant.name}</h1><p>{containerCode}</p></header>
      <section className="entry-target-card"><span>Số lít quán khai</span><strong>{formatLiters(stop.expected_liters)}</strong>{pickupVolumeForecast ? <div className="entry-volume-forecast"><strong>{pickupVolumeForecast.predictedLiters === null ? 'AI chưa đủ dữ liệu để dự báo sản lượng.' : `AI dự báo: khoảng ${formatPickupVolumeLiters(pickupVolumeForecast.predictedLiters)}`}</strong><small>{pickupVolumeForecast.confidenceLabel}</small>{pickupVolumeForecast.declaredOnly ? <small>AI chưa có đủ lịch sử riêng cho quán này.</small> : null}</div> : null}</section>
      <section className="liter-entry-card">
        <label htmlFor="actual-kilograms">{mass.kgAuto ? 'Khối lượng (tự tính)' : 'Khối lượng (kg đã cân)'}</label>
        <div className="large-number-input"><button onClick={() => adjustMass('kg', -0.5)} disabled={saving || mass.kgAuto} aria-label="Giảm 0,5 kg">−</button><input id="actual-kilograms" aria-describedby="actual-kilograms-help" type="text" inputMode="decimal" value={mass.kgText} onChange={(event) => setMassEntry((state) => editMassField(state, 'kg', event.target.value))} placeholder="0,0" /><span>kg</span><button onClick={() => adjustMass('kg', 0.5)} disabled={saving || mass.kgAuto} aria-label="Tăng 0,5 kg">+</button></div>
        <p id="actual-kilograms-help" className={invalidKg ? 'error-text' : 'field-help'}>{mass.kgAuto ? 'Tự tính từ số lít, không phải số cân. Có số cân thì nhập vào ô này.' : actualKg === null ? 'Không có số cân? Nhập số lít bên dưới, kg sẽ tự tính.' : 'SCALE — số kg này là số cân thực tế.'}</p>
        <label htmlFor="actual-liters">Số lít thực tế{mass.litersAuto ? ' (tự tính)' : ''}</label>
        <div className="large-number-input"><button onClick={() => adjustMass('liters', -0.5)} disabled={saving || mass.litersAuto} aria-label="Giảm 0,5 lít">−</button><input id="actual-liters" aria-describedby="actual-liters-help" type="text" inputMode="decimal" value={mass.litersText} onChange={(event) => setMassEntry((state) => editMassField(state, 'liters', event.target.value))} placeholder="0,0" /><span>lít</span><button onClick={() => adjustMass('liters', 0.5)} disabled={saving || mass.litersAuto} aria-label="Tăng 0,5 lít">+</button></div>
        <p id="actual-liters-help" className={invalidLiters && (massEntry.sourceText || litersDerivedFromKilograms) ? 'error-text' : 'field-help'}>{litersDerivedFromKilograms ? `Số lít ước tính từ khối lượng: ${actualLiters.toFixed(2)} lít · dung tích tối đa ${maxLiters.toFixed(1)} lít` : `Dung tích ${formatLiters(capacity)} · tối đa ${maxLiters.toFixed(1)} lít`}</p>
        {pickupVolumeDeviation?.level === 'NORMAL' ? <p className="pickup-volume-deviation pickup-volume-deviation-normal">Sản lượng nằm gần mức AI dự báo.</p> : null}
        {pickupVolumeDeviation?.level === 'REVIEW' ? <p className="pickup-volume-deviation pickup-volume-deviation-review">Số lít đang chênh {formatDeviationPercent(pickupVolumeDeviation.deviation_pct)} so với AI dự báo. Hãy kiểm tra lại số nhập và mức dầu trong can.</p> : null}
        {pickupVolumeDeviation?.level === 'HIGH' ? <div className="pickup-volume-deviation pickup-volume-deviation-high"><strong>Chênh lệch rất cao so với AI dự báo.</strong><span>AI dự báo {formatPickupVolumeLiters(pickupVolumeDeviation.predicted_liters)}</span><span>Thực tế nhập {formatPickupVolumeLiters(pickupVolumeDeviation.actual_liters)}</span><span>Chênh lệch {formatSignedDeviationLiters(pickupVolumeDeviation.deviation_liters)} ({formatDeviationPercent(pickupVolumeDeviation.deviation_pct)})</span><label className="pickup-volume-ack"><input type="checkbox" checked={highDeviationAcknowledgement === highDeviationKey} onChange={(event) => setHighDeviationAcknowledgement(event.target.checked ? highDeviationKey : null)} disabled={saving} /><span>Tôi đã kiểm tra lại số lít và xác nhận tiếp tục.</span></label></div> : null}
      </section>
      <section className="quality-card">
        <p className="section-label">Phân hạng dầu</p>
        <OilGradeSelector value={grade} disabled={saving} onChange={(nextGrade) => { setGrade(nextGrade); setGradeTouched(true); gradeTouchedRef.current = true; setOverrideAcknowledged(false); }} />
        {isAiPreselected({ grade, gradeTouched, analysis: imageAnalysis }) ? <p className="field-help">AI chọn sẵn hạng {grade} (tin cậy cao). Bấm hạng khác nếu thấy không đúng.</p> : null}
        <label className="toggle-row"><input type="checkbox" checked={suspectedAdulteration} onChange={(event) => setSuspectedAdulteration(event.target.checked)} disabled={saving} /><span>Nghi ngờ pha lẫn</span></label>
        <p className="field-help">Bật nếu thấy có nước, dầu nhớt hoặc mùi lạ không phải dầu ăn.</p>
        <p className="section-label">Chất lượng dầu{qualityAuto ? ' (tự chọn)' : ''}</p>
        <div className="quality-options"><button className={quality === Quality.PASS ? 'quality-option selected' : 'quality-option'} onClick={() => setManualQuality(Quality.PASS)} disabled={saving}>Đạt</button><button className={quality === Quality.FLAG ? 'quality-option selected flag-selected' : 'quality-option'} onClick={() => setManualQuality(Quality.FLAG)} disabled={saving}>Cần kiểm tra</button></div>
        {qualityAuto ? <p className="field-help">{quality === Quality.FLAG ? 'Tự chọn "Cần kiểm tra" vì hạng C hoặc nghi ngờ pha lẫn. Bấm để đổi nếu khác thực tế.' : 'Tự chọn theo hạng dầu. Bấm để đổi nếu khác thực tế.'}</p> : null}
        <label className="grade-note-label" htmlFor="grade-note">Ghi chú phân hạng (không bắt buộc)</label>
        <textarea className="grade-note-input" id="grade-note" value={gradeNote} onChange={(event) => setGradeNote(event.target.value)} disabled={saving} placeholder="Ghi chú thêm nếu cần" />
      </section>
      <GradePhotoPicker photos={photos} busy={takingPhoto} disabled={saving} message={photoNotice} onTakePhoto={() => { void takePhoto(); }} onChooseAlbum={() => { void chooseAlbumPhoto(); }} onChooseFile={(file) => { void choosePhotoFile(file); }} onRemovePhoto={removePhoto} />
      {analysisError ? <section className="image-grade-analysis image-grade-analysis-error" role="alert"><span>{analysisError}</span><button type="button" className="secondary-button" onClick={() => { void analyzePhotos(photos); }} disabled={analyzingImages || saving}>Thử phân tích lại</button></section> : null}
      {analyzingImages ? <section className="image-grade-analysis image-grade-analysis-neutral" aria-live="polite"><strong>AI hỗ trợ phân hạng</strong><span>Đang phân tích ảnh…</span></section> : null}
      {imageGradeDisplay && !analyzingImages ? (
        <section className={`image-grade-analysis image-grade-analysis-${imageAnalysis?.confidence.toLowerCase() ?? 'low'}`} aria-label="AI hỗ trợ phân hạng">
          <div className="image-grade-analysis-heading"><span className="image-grade-ai-label">AI hỗ trợ</span><strong>Phân tích hình ảnh thử nghiệm</strong></div>
          {imageGradeDisplay.suggestedGrade ? <p><strong>Gợi ý: {imageGradeDisplay.suggestedGrade}</strong> · {imageGradeDisplay.confidenceLabel}</p> : <p><strong>Chưa có gợi ý phân hạng</strong> · {imageGradeDisplay.confidenceLabel}</p>}
          <small>{imageGradeDisplay.qualityLabel}</small>
          <TechDetails><span>provider: {imageAnalysis?.provider ?? 'on-device-heuristic'}</span><span>model: {imageAnalysis?.model_version ?? 'unknown'}</span></TechDetails>
          <small>{imageGradeDisplay.summary}</small>
          {imageGradeDisplay.reasons.length > 0 ? <div className="image-grade-reasons">{imageGradeDisplay.reasons.map((reason, index) => <span key={`${reason}-${index}`}>{reason}</span>)}</div> : null}
          {suggestedGrade && grade && suggestedGrade !== grade ? <p className="image-grade-disagreement" role="status"><strong>Khác gợi ý:</strong> bạn chọn hạng {grade}, AI gợi ý hạng {suggestedGrade}. Lý do AI: {imageGradeDisplay.reasons.join(', ') || 'tín hiệu hình ảnh hạn chế'}.</p> : null}
          {imageGradeDisplay.canUseSuggestion && imageAnalysis?.suggested_grade ? <button type="button" className="secondary-button image-grade-use-button" onClick={() => { setGrade(imageAnalysis.suggested_grade as OilGrade); setGradeTouched(true); gradeTouchedRef.current = true; setOverrideAcknowledged(false); }} disabled={saving}>Dùng gợi ý này</button> : null}
          {needsImageGradeOverrideAcknowledgement ? <label className="image-grade-override"><input type="checkbox" checked={overrideAcknowledged} onChange={(event) => setOverrideAcknowledged(event.target.checked)} disabled={saving} /><span>Tôi đã kiểm tra và xác nhận giữ phân hạng đã chọn.</span></label> : null}
        </section>
      ) : null}
      {error ? <div className="error-panel" role="alert">{error}</div> : null}
      <section className="entry-meta-card"><p className={locationFallback ? 'location-banner' : 'field-help'}>{gpsStatus.text}</p>{gpsStatus.showRetry ? <button type="button" className="text-button" onClick={() => { void retryGps(); }} disabled={locating || saving}>Lấy lại GPS</button> : null}<TechDetails><span>Mã giao dịch: {clientUuid}</span></TechDetails></section>
      {submitBlockReasons.length > 0 ? <div className="error-text submit-block-reason" role="alert"><strong>Còn thiếu:</strong><ul>{submitBlockReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : null}
      <button className="submit-collection-button" onClick={() => { void submit(); }} disabled={saving || submitBlockReasons.length > 0}>{saving ? 'Đang lưu trên máy…' : 'Xác nhận thu gom'}</button>
    </div>
  );
}

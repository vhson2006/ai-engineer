import { Composition } from 'remotion';
import { COMPOSITIONS } from './compositions';
import { totalFrames, type StudioVideoProps } from './props';

/** What Remotion Studio shows before real props (`npm run studio -w @web/video`). */
const SAMPLE: StudioVideoProps = {
  templateId: 'price-hook',
  fps: 30,
  width: 1080,
  height: 1920,
  brand: {
    name: 'Giặt sấy SFaster',
    tagline: 'Mỗi khách một máy',
    phone: '0909 123 456',
    callToAction: 'Gọi hoặc nhắn Zalo cho tiệm',
    footerNote: null,
    primaryColor: '#13883a',
    accentColor: '#ffd400',
    logoUrl: null,
  },
  scenes: [
    {
      id: 'hook',
      imageUrl: null,
      avatarUrl: null,
      avatarMode: null,
      voiceUrl: null,
      voice: 'Giặt sấy chỉ từ 35.000đ một mẻ?',
      onScreen: 'Từ 35.000đ/mẻ',
      durationInFrames: 75,
    },
    {
      id: 'benefit1',
      imageUrl: null,
      avatarUrl: null,
      avatarMode: null,
      voiceUrl: null,
      voice: 'Mỗi khách một máy riêng, không giặt chung.',
      onScreen: '1 khách = 1 máy',
      durationInFrames: 90,
    },
  ],
  endCardFrames: 45,
};

/**
 * Every composition, sized by its props (calculateMetadata): content-service computed each
 * scene's frames from its voice, so the video lasts exactly as long as its lines.
 */
export function Root() {
  return (
    <>
      {Object.entries(COMPOSITIONS).map(([id, component]) => (
        <Composition
          key={id}
          id={id}
          component={component}
          defaultProps={{ ...SAMPLE, templateId: id }}
          durationInFrames={totalFrames(SAMPLE)}
          fps={SAMPLE.fps}
          width={SAMPLE.width}
          height={SAMPLE.height}
          calculateMetadata={({ props }) => ({
            durationInFrames: totalFrames(props),
            fps: props.fps,
            width: props.width,
            height: props.height,
          })}
        />
      ))}
    </>
  );
}

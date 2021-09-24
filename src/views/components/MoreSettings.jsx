import React, {
  useState,
  useContext,
  Fragment,
  useMemo,
  useEffect,
} from "react";
import {
  Button,
  ContextMenu,
  ContextMenuItem,
  HamburgerMenuIcon,
  PersonIcon,
  Settings,
  ParticipantsInView,
  SettingsIcon,
  useHMSStore,
  selectAvailableRoleNames,
  selectLocalPeer,
  TickIcon,
  GridIcon,
  ArrowRightIcon,
  useHMSActions,
  selectPermissions,
  FullScreenIcon,
  MessageModal,
} from "@100mslive/hms-video-react";
import { AppContext } from "../../store/AppContext";
import { hmsToast } from "./notifications/hms-toast";
import { arrayIntersection, setFullScreenEnabled } from "../../common/utils";
import screenfull from "screenfull";
import { RecordingAndRTMPForm } from "./RecordingAndRTMPForm";

const url =
  window.location.href.replace("meeting", "preview") + "?token=beam_recording";

export const MoreSettings = () => {
  const {
    setMaxTileCount,
    maxTileCount,
    appPolicyConfig: { selfRoleChangeTo },
  } = useContext(AppContext);
  const roles = useHMSStore(selectAvailableRoleNames);
  const localPeer = useHMSStore(selectLocalPeer);
  const permissions = useHMSStore(selectPermissions);
  const hmsActions = useHMSActions();
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipantsInView, setShowParticipantsInView] = useState(false);
  const [showRecordingAndRTMPModal, setShowRecordingAndRTMPModal] =
    useState(false);
  const [isRecordingOrRTMPStarted, setIsRecordingOrRTMPStarted] =
    useState(false);

  const [meetingURL, setMeetingURL] = useState(url);
  const [rtmpURL, setRtmpURL] = useState("");
  const [isRecordingOn, setIsRecordingOn] = useState(false);

  const [anchorEl, setAnchorEl] = useState(null);
  const [isFullScreenEnabled, setIsFullScreenEnabled] = useState(
    screenfull.isFullscreen
  );

  const availableSelfChangeRoles = useMemo(
    () => arrayIntersection(selfRoleChangeTo, roles),
    [roles, selfRoleChangeTo]
  );

  useEffect(() => {
    if (screenfull.isEnabled) {
      screenfull.on("change", () => {
        setIsFullScreenEnabled(screenfull.isFullscreen);
      });
    }
  }, []);

  const onChange = count => {
    setMaxTileCount(count);
  };

  const handleClick = async () => {
    try {
      if (!isRecordingOrRTMPStarted) {
        await hmsActions.startRTMPOrRecording({
          meetingURL,
          rtmpURLs: rtmpURL.length > 0 ? [rtmpURL] : undefined,
          record: isRecordingOn,
        });
        setShowRecordingAndRTMPModal(false);
        setIsRecordingOrRTMPStarted(true);
        setIsRecordingOn(false);
        setMeetingURL("");
        setRtmpURL("");
      } else {
        await hmsActions.stopRTMPAndRecording();
        setIsRecordingOrRTMPStarted(false);
      }
    } catch (error) {
      console.error("failed to start rtmp/recording", error);
      hmsToast(error.message);
    }
  };

  return (
    <Fragment>
      <ContextMenu
        menuOpen={showMenu}
        onTrigger={value => {
          setShowMenu(value);
        }}
        classes={{
          root: "static",
          trigger: "bg-transparent-0",
          menu: "mt-0 py-0 w-52",
        }}
        trigger={
          <Button
            iconOnly
            variant="no-fill"
            iconSize="md"
            shape="rectangle"
            active={showMenu}
          >
            <HamburgerMenuIcon />
          </Button>
        }
        menuProps={{
          anchorOrigin: {
            vertical: "top",
            horizontal: "center",
          },
          transformOrigin: {
            vertical: "bottom",
            horizontal: "center",
          },
        }}
      >
        {screenfull.isEnabled && (
          <ContextMenuItem
            icon={<FullScreenIcon />}
            label={`${isFullScreenEnabled ? "Exit " : ""}Full Screen`}
            key="toggleFullScreen"
            onClick={() => {
              setFullScreenEnabled(!isFullScreenEnabled);
            }}
          />
        )}
        <ContextMenuItem
          icon={<GridIcon />}
          label="Change Layout"
          key="changeLayout"
          onClick={() => {
            setShowParticipantsInView(true);
          }}
        />
        {permissions.changeRole && (
          <ContextMenuItem
            icon={<PersonIcon />}
            label="Change my role"
            key="changeRole"
            classes={{
              menuTitleContainer: "relative",
              menuItemChildren: "hidden",
            }}
            closeMenuOnClick={false}
            iconRight={<ArrowRightIcon />}
            onClick={event => {
              setAnchorEl(anchorEl ? null : event.currentTarget);
            }}
            active={!!anchorEl}
          >
            {anchorEl && (
              <ContextMenu
                classes={{ trigger: "bg-transparent-0", menu: "w-44" }}
                menuOpen
                menuProps={{
                  anchorEl: anchorEl,
                  anchorOrigin: {
                    vertical: "top",
                    horizontal: "right",
                  },
                  transformOrigin: {
                    vertical: "center",
                    horizontal: -12,
                  },
                }}
                trigger={<div className="absolute w-full h-0"></div>}
              >
                {availableSelfChangeRoles.map(role => {
                  return (
                    <ContextMenuItem
                      label={role}
                      key={role}
                      onClick={async () => {
                        try {
                          await hmsActions.changeRole(localPeer.id, role, true);
                          setShowMenu(false);
                        } catch (error) {
                          hmsToast(error.message);
                        }
                      }}
                      iconRight={
                        localPeer && localPeer.roleName === role ? (
                          <TickIcon width={16} height={16} />
                        ) : null
                      }
                    />
                  );
                })}
              </ContextMenu>
            )}
          </ContextMenuItem>
        )}
        <ContextMenuItem
          icon={<SettingsIcon />}
          label={`${
            isRecordingOrRTMPStarted ? "Stop" : "Start"
          } Streaming/Recording`}
          key="streaming-recording"
          addDivider={true}
          onClick={() => {
            !isRecordingOrRTMPStarted
              ? setShowRecordingAndRTMPModal(true)
              : handleClick();
          }}
        />
        <ContextMenuItem
          icon={<SettingsIcon />}
          label="Device Settings"
          key="settings"
          addDivider={true}
          onClick={() => {
            setShowSettings(true);
          }}
        />
      </ContextMenu>
      <Settings
        className="hidden"
        showModal={showSettings}
        onModalClose={() => setShowSettings(false)}
      />
      <ParticipantsInView
        onTileCountChange={onChange}
        maxTileCount={maxTileCount}
        showModal={showParticipantsInView}
        onModalClose={() => setShowParticipantsInView(false)}
      />
      <MessageModal
        title="Start Streaming/Recording"
        body={
          <RecordingAndRTMPForm
            meetingURL={meetingURL}
            RTMPURLs={rtmpURL}
            isRecordingOn={isRecordingOn}
            setIsRecordingOn={setIsRecordingOn}
            setMeetingURL={setMeetingURL}
            setRTMPURLs={setRtmpURL}
          />
        }
        footer={
          <div>
            <Button shape="rectangle" onClick={handleClick}>
              Start
            </Button>
          </div>
        }
        show={showRecordingAndRTMPModal}
        onClose={() => setShowRecordingAndRTMPModal(false)}
      />
    </Fragment>
  );
};

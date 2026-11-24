"use client";
import { useSyncExternalStore, type CSSProperties } from "react";
import {
  DEFAULT_PET,
  PETS,
  PET_CELL,
  getPetSettings,
  getServerPetSettings,
  petAtlasUrl,
  subscribePetSettings,
  updatePetSettings,
} from "@/shared/lib/pets";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { Row, Section, useAccountText } from "./account-ui";
import page from "./ProfilePage.module.css";
import styles from "./AccountPets.module.css";

const THUMB = 64;

export function AccountPets() {
  const { text } = useAccountText();
  const settings = useSyncExternalStore(
    subscribePetSettings,
    getPetSettings,
    getServerPetSettings,
  );
  return (
    <>
      <Section title={text("pet_companion", "Companion")}>
        <div className={page.group}>
          <Row
            title={text("pet_enable", "Show a pet")}
            description={text(
              "pet_enable_help",
              "A small animated companion that stays with you on every page. Click it to chat, attach files or talk with voice; drag it anywhere.",
            )}
          >
            <button
              type="button"
              role="switch"
              className={page.switch}
              aria-label={text("pet_enable", "Show a pet")}
              aria-checked={settings.enabled}
              onClick={() => updatePetSettings({ enabled: !settings.enabled })}
            >
              <span />
            </button>
          </Row>
          <Row
            title={text("pet_size", "Size")}
            description={text("pet_size_help", "How large the pet appears.")}
          >
            <input
              className={page.contrastRange}
              type="range"
              min={96}
              max={200}
              step={4}
              aria-label={text("pet_size", "Size")}
              value={settings.size}
              onChange={(event) =>
                updatePetSettings({ size: Number(event.target.value) })
              }
            />
            <output>{settings.size}</output>
          </Row>
        </div>
      </Section>
      <Section
        title={text("pet_choose", "Choose your pet")}
        description={text(
          "pet_choose_help",
          "Each one reacts to your chats: it thinks, talks, celebrates and falls asleep when things are quiet.",
        )}
      >
        <div
          className={`${page.group} ${styles.list}`}
          role="radiogroup"
          aria-label={text("pet_choose", "Choose your pet")}
        >
          {PETS.map((pet) => {
            const selected = settings.id === pet.id;
            return (
              <button
                key={pet.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={styles.pet}
                style={{ "--pet-accent": pet.accent } as CSSProperties}
                onClick={() => updatePetSettings({ id: pet.id, enabled: true })}
              >
                <span
                  className={styles.thumb}
                  aria-hidden="true"
                  style={{
                    width: (THUMB * PET_CELL.width) / PET_CELL.height,
                    height: THUMB,
                    backgroundImage: `url(${petAtlasUrl(pet.id)})`,
                    backgroundSize: `${((THUMB * PET_CELL.width) / PET_CELL.height) * 8}px auto`,
                  }}
                />
                <span className={styles.text}>
                  <strong>{pet.name}</strong>
                  <small>{text(`pet_${pet.id}`, pet.description)}</small>
                </span>
                <span className={styles.check} data-on={selected}>
                  <WorkspaceIcon name="check" size={15} />
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <div className={styles.footer}>
        <span>
          {text(
            "pet_footer",
            "Right-click the pet for quick options. Its position is remembered on this device.",
          )}
        </span>
        <button
          type="button"
          className={styles.reset}
          onClick={() =>
            updatePetSettings({
              x: DEFAULT_PET.x,
              y: DEFAULT_PET.y,
              size: DEFAULT_PET.size,
            })
          }
        >
          {text("pet_reset_position", "Reset position and size")}
        </button>
      </div>
    </>
  );
}

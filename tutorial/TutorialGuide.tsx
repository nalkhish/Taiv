import React, { useState, useEffect, useCallback } from 'react';
import { useWindowSize, useWindowScrollYPosition } from '../../hooks';
import Modal from '../modal';
import { ToolTip, ToolTipPropsType as TipPropsType } from '../tooltips/ToolTip';
import './TutorialGuide.scss';


export type StepInfoType = {elementId: string, tipProps: TipPropsType};
export type StepsInfoType = StepInfoType[];

const INITIAL_HOLE_DIMENSIONS = {top: "-200vh", left: "-200vw", height: "0px", width: "0px"};


export interface TutorialGuidePropsType {
  /** An element that contains the highlighted HTML elements in this tutorial
   * Used to force rechecking for appearance of elements. 
   */
  tutorialRef: React.RefObject<HTMLDivElement>,
  /** The steps that are highlight in this tutorial */
  highlightedSteps: StepsInfoType
}

/** This component overlays a position-tracking background and tips for a tutorial 
 * Use to emphasize and guide users on steps
*/
function TutorialGuide ({ 
    tutorialRef,
    highlightedSteps
  }: TutorialGuidePropsType) {

  const [remainingSteps, setRemainingSteps] = useState(highlightedSteps);

  type StepType = {
    el: HTMLElement | null,
    tipProps: TipPropsType | null,
  }
  const [currentStep, setCurrentStep] = useState<StepType>({el: null, tipProps: null});
  const [holeDims, setHoleDims] = useState(INITIAL_HOLE_DIMENSIONS);

  /** Set dimensions for a hole at the focus element 
   * if element is null, reset hole dimensions
  */
  const positionHole = useCallback((el: HTMLElement | null) => {
    if (el) {
      const elDimensions = el.getBoundingClientRect();
      setHoleDims({
        top: `${elDimensions.top}px`,
        left: `${elDimensions.left}px`,
        height: `${elDimensions.height}px`,
        width: `${elDimensions.width}px`
      });
    } else {
      setHoleDims(INITIAL_HOLE_DIMENSIONS);
    }
  }, []);

  /** Look for the next step that hasn't had an overlay
   * Resets on refreshing page
   * subscribed with a mutation observer because the question can change without retrigerring effect
   */
  useEffect(() => {
    /** Only advances when current step is null (previous overlay has to have been dismissed) */
    const goToNextVisibleStep = () => {
      if (currentStep.el === null) {
        for (let idx = 0; idx <= remainingSteps.length - 1; idx++) {
          const stepInfo = remainingSteps[idx];
          const el = document.getElementById(stepInfo.elementId);
          if (el) {
            setCurrentStep({el, tipProps: stepInfo.tipProps});
            setRemainingSteps((cur) => cur.filter((step) => step.elementId !== stepInfo.elementId));
            break;
          }
        }
      }
    }

    goToNextVisibleStep();
    let observer: MutationObserver;
    if (tutorialRef.current) {
      observer = new MutationObserver(() => goToNextVisibleStep());
      observer.observe(tutorialRef.current, { attributes: true, childList: true, subtree: true });
    }
    return () => {
      if (observer && observer.disconnect) { observer.disconnect() }
    }
  }, [tutorialRef, remainingSteps, currentStep])

  /** reposition overlay hole when dom changes - for example: class change after animation */
  useEffect(() => {
    let observer: MutationObserver;
    if (tutorialRef.current) {
      observer = new MutationObserver(() => positionHole(currentStep.el));
      observer.observe(tutorialRef.current, { attributes: true, childList: true, subtree: true });
    }
    return () => {
      if (observer && observer.disconnect) { observer.disconnect() }
    }
  }, [currentStep, positionHole, tutorialRef]);

  /** reposition overlay hole when scrolling or changing window size */
  const windowSize = useWindowSize();
  const WindowScrollYPosition = useWindowScrollYPosition();
  useEffect(() => {
    positionHole(currentStep.el);
  }, [currentStep, positionHole, windowSize.height, windowSize.width, WindowScrollYPosition]);

  if (!currentStep.el) {
    return null
  }

  return (
    <Modal>
      <div
        className="position-fixed fill-container tutorial-guide"
        onClick={() => setCurrentStep({el: null, tipProps: null})}
        onKeyDown={(e) => e.key === 'Enter' ? setCurrentStep({el: null, tipProps: null}) : null}
        tabIndex={0}
        role="button"
        aria-label="Overlay hiding interface"
      >
        <div className="position-absolute"
          style={{
            "top": `${holeDims.top}`, 
            "left": `${holeDims.left}`,
            "width": `${holeDims.width}`,
            "height": `${holeDims.height}`,
          }}
        >
          {currentStep.tipProps !== null ?
            <ToolTip
              isAboveElement={currentStep.tipProps.isAboveElement || false}
              isRightJustified={currentStep.tipProps.isRightJustified || false}
            >
              {currentStep.tipProps.children}
            </ToolTip>
          :   
            null
          }
        </div>
      </div>
    </Modal>
  )
}

export default TutorialGuide